package ws

import (
	"context"
	"encoding/json"
	"fmt"
	"google-meet/lib"
	"google-meet/query"
	"log"
	"os"
	"sync"
	"time"

	"github.com/golang-jwt/jwt"
	// "github.com/gorilla/websocket"
	"github.com/pion/rtcp"
	"github.com/pion/webrtc/v4"
)

func JoinMeeting(ctx context.Context, conn *threadSafeWriter, message WebsocketMessage) {
	joinMeetingPayload := &JoinMeetingPayload{}
	if err := json.Unmarshal([]byte(message.Data), &joinMeetingPayload); err != nil {
		logger.Errorf("Failed to unmarshal json to join meeting: %v", err)
		return
	}

	claims := &lib.TokenPayload{}
	token, err := jwt.ParseWithClaims(joinMeetingPayload.Token, claims, (func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
		}
		return []byte(os.Getenv("SECRET")), nil

	}))
	if err != nil || !token.Valid {
		logger.Errorf("Unauthorized: %v", err)
		return
	}

	SafeWriteToUsers(claims.Id, conn)
	wsUserMap[conn.Conn] = claims.Id

	meet, err := query.GetMeetingById(ctx, joinMeetingPayload.MeetingId)
	if err != nil {
		logger.Errorf("Something went wrong while fetching meeting details: %v", err)
		conn.WriteJSON(map[string]interface{}{
			"event":   "error",
			"message": "Something went wrong while fetching meeting details",
		})
		return
	}

	_, alreadyExist := connections[meet.Id]

	if alreadyExist {
		_, alreadyExist = connections[meet.Id].PeerConnections[claims.Id]
	}

	if meet.UserId == claims.Id && !alreadyExist {
		lib.RedisClient.Set(ctx, fmt.Sprintf("google-meet:host:%s", meet.Id), lib.Host, time.Hour*24)
	}

	if meet.UserId != claims.Id && !alreadyExist {
		host, hostExist := SafeReadFromUsers(meet.UserId)
		if !hostExist {
			conn.WriteJSON(map[string]interface{}{
				"event":   "error",
				"message": "Host has not joined yet please wait and try again",
			})
			return
		}
		user, err := query.GetUserById(ctx, claims.Id)
		if err != nil {
			conn.WriteJSON(map[string]interface{}{
				"event":   "error",
				"message": "Something went wrong while fetching details",
			})
			return
		}
		err = host.WriteJSON(map[string]interface{}{
			"event": "request-participant-join",
			"data": map[string]interface{}{
				"userId": user.Id,
				"name":   user.Name,
				"email":  user.Email,
			},
		})

		if err != nil {
			conn.WriteJSON(map[string]interface{}{
				"event":   "error",
				"message": "Something went wrong",
			})
			return
		}
		// RequestJoinMeetingMap[fmt.Sprintf("%s-%s", joinMeetingPayload.MeetingId, user.Id)] = JoinMeetingRequest{
		// 	MeetingId: joinMeetingPayload.MeetingId,
		// 	UserId: user.Id,
		// 	Name: user.Name,
		// 	Email: user.Email,
		// }
		return
	}
	JoinMeetingRequestHandler(ctx, joinMeetingPayload.MeetingId, claims.Id)
}

func JoinMeetingRequestHandler(ctx context.Context, meetingId string, userId string) {
	log.Println("Joining meeting: ", meetingId, userId)
	user, exist := SafeReadFromUsers(userId)
	if !exist {
		return
	}
	peerConnection, err := webrtc.NewPeerConnection(webrtc.Configuration{
		ICEServers: []webrtc.ICEServer{
			{
				URLs: []string{"stun:stun.l.google.com:19302", "stun:urn.atulmorchhlay.com:3478"},
			},
			// {
			// 	URLs: []string{"turn:urn.atulmorchhlay.com:3478"},
			// },
		},
	})
	if err != nil {
		SendMessage(userId, map[string]interface{}{
			"event":   "error",
			"message": "Failed to creates a PeerConnection",
		})
		return
	}
	// defer peerConnection.Close()

	for _, typ := range []webrtc.RTPCodecType{webrtc.RTPCodecTypeVideo, webrtc.RTPCodecTypeAudio} {
		if _, err := peerConnection.AddTransceiverFromKind(typ, webrtc.RTPTransceiverInit{
			Direction: webrtc.RTPTransceiverDirectionRecvonly,
		}); err != nil {
			SendMessage(userId, map[string]interface{}{
				"event":   "error",
				"message": fmt.Sprintf("Failed to add transceiver: %v", err.Error()),
			})
			return
		}
	}
	_, connectionExist := connections[meetingId]
	if !connectionExist {
		log.Println("userId-PeerConnections", userId)
		connections[meetingId] = &Connection{
			ListLock:        sync.RWMutex{},
			TrackLocals:     map[string]*webrtc.TrackLocalStaticRTP{},
			PeerConnections: map[string]*PeerConnectionState{},
			TrackLocalsMap:  sync.Map{},
			OfferQueue:      OfferQueue{},
		}
	}

	meeting, meetingExist := connections[meetingId]
	if !meetingExist {
		SendMessage(userId, map[string]interface{}{
			"event":   "error",
			"message": fmt.Sprintf("Meeting not found while joining meet: %s", meetingId),
		})
		return
	}

	keys := []string{}
	meeting.TrackLocalsMap.Range(func(key, value any) bool {
		if value == userId {
			keys = append(keys, key.(string))
		}
		return true
	})

	for _, v := range keys {
		meeting.TrackLocalsMap.Delete(v)
	}

	meeting.ListLock.Lock()
	meeting.PeerConnections[userId] = &PeerConnectionState{peerConnection, user}
	// log.Println("userId-PeerConnections", userId, )
	meeting.ListLock.Unlock()

	peerConnection.OnICECandidate(func(i *webrtc.ICECandidate) {
		if i == nil {
			return
		}
		candidateString, err := json.Marshal(i.ToJSON())
		if err != nil {
			SendMessage(userId, map[string]interface{}{
				"event":   "error",
				"message": fmt.Sprintf("Failed to marshal candidate to json: %v", err),
			})
			return
		}

		if writeErr := user.WriteJSON(map[string]string{
			"event": "candidate",
			"data":  string(candidateString),
		}); writeErr != nil {
			SendMessage(userId, map[string]interface{}{
				"event":   "error",
				"message": fmt.Sprintf("Failed to write JSON: %v", writeErr),
			})
		}
	})

	peerConnection.OnConnectionStateChange(func(pcs webrtc.PeerConnectionState) {
		logger.Infof("Connection state change: %s", pcs)
		switch pcs {
		case webrtc.PeerConnectionStateFailed:
			if err := peerConnection.Close(); err != nil {
				logger.Errorf("Failed to close PeerConnection: %v", err)
			}
		case webrtc.PeerConnectionStateClosed:
			signalPeerConnections(meetingId, userId)
		default:
		}
	})

	peerConnection.OnTrack(func(tr *webrtc.TrackRemote, r *webrtc.RTPReceiver) {
		log.Println("Track received on server", r.Track().ID())
		TrackHandler(tr, meetingId, userId)
	})

	peerConnection.OnICEConnectionStateChange(func(is webrtc.ICEConnectionState) {
		logger.Infof("ICE connection state changed: %s meedId=%s", is, meetingId)
	})

	SafeUpdateMeetingToUsers(userId, meetingId)
	SendMessage(userId, map[string]interface{}{
		"event": "joining-meeting",
		"data": map[string]interface{}{
			"meetingId": meetingId,
			"pid":       os.Getpid(),
		},
	})

	signalPeerConnections(meetingId, userId)
}

func signalPeerConnections(meetingId string, userId string) {
	meeting, exist := connections[meetingId]
	if !exist {
		return
	}
	meeting.ListLock.Lock()
	defer func() {
		meeting.ListLock.Unlock()
		dispatchKeyFrame(meeting)
	}()

	attemptSync := func() (tryAgain bool) {
		for participantId := range meeting.PeerConnections {
			if meeting.PeerConnections[participantId].PeerConnection.ConnectionState() == webrtc.PeerConnectionStateClosed {
				return true
			}

			existingSenders := map[string]bool{}

			for _, sender := range meeting.PeerConnections[participantId].PeerConnection.GetSenders() {
				if sender.Track() == nil {
					continue
				}
				existingSenders[sender.Track().ID()] = true
				if _, ok := meeting.TrackLocals[sender.Track().ID()]; !ok {
					if err := meeting.PeerConnections[participantId].PeerConnection.RemoveTrack(sender); err != nil {
						return true
					}
				}
			}

			// Don't receive videos we are sending, make sure we don't have loopback
			for _, receiver := range meeting.PeerConnections[participantId].PeerConnection.GetReceivers() {
				if receiver.Track() == nil {
					continue
				}

				existingSenders[receiver.Track().ID()] = true
			}

			// Add all track we aren't sending yet to the PeerConnection
			for trackID, _ := range meeting.TrackLocals {
				if _, ok := existingSenders[trackID]; !ok {
					if _, err := meeting.PeerConnections[participantId].PeerConnection.AddTrack(meeting.TrackLocals[trackID]); err != nil {
						return true
					}
				}
			}

			err := Offer(meetingId, participantId)
			if err != nil {
				return true
			}
		}
		return
	}

	for syncAttempt := 0; ; syncAttempt++ {
		if syncAttempt == 25 {
			// Release the lock and attempt a sync in 3 seconds. We might be blocking a RemoveTrack or AddTrack
			go func() {
				time.Sleep(time.Second * 3)
				signalPeerConnections(meetingId, userId)
			}()
			return
		}

		if !attemptSync() {
			break
		}
	}
}

func dispatchKeyFrame(meeting *Connection) {
	meeting.ListLock.Lock()
	defer meeting.ListLock.Unlock()

	for i := range meeting.PeerConnections {
		for _, receiver := range meeting.PeerConnections[i].PeerConnection.GetReceivers() {
			if receiver.Track() == nil {
				continue
			}

			_ = meeting.PeerConnections[i].PeerConnection.WriteRTCP([]rtcp.Packet{
				&rtcp.PictureLossIndication{
					MediaSSRC: uint32(receiver.Track().SSRC()),
				},
			})
		}
	}
}

type JoinMeetingPayload struct {
	MeetingId string `json:"meetingId"`
	Token     string `json:"token"`
	// Audio     bool   `json:"audio"`
	// Video     bool   `json:"video"`
}

type JoinMeetingRequest struct {
	MeetingId string `json:"meetingId"`
	UserId    string `json:"userId"`
	Name      string `json:"name"`
	Email     string `json:"email"`
	// Audio     bool   `json:"audio"`
	// Video     bool   `json:"video"`
}
