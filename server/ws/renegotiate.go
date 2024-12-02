package ws

import (
	"context"
	"encoding/json"
	"fmt"
	"google-meet/query"
	"log"
	"sync"
	"time"

	"github.com/pion/webrtc/v4"
)

func Renegotiate(ctx context.Context, userId string, payload string) {
	user, exist := SafeReadFromUsers(userId)
	if !exist {
		return
	}
	var renegotiatePayload RenegotiatePayload
	if err := json.Unmarshal([]byte(payload), &renegotiatePayload); err != nil {
		user.WriteJSON(map[string]string{
			"event":   "error",
			"message": "Something went wrong while parsing data",
		})
		return
	}
	err := Offer(renegotiatePayload.MeetingId, userId)
	if err != nil {
		log.Println(err.Error())
		SendMessage(userId, map[string]string{
			"event":   "error",
			"message": "Error while renegotiating",
		})
	}

	// meeting, meetingExist := connections[renegotiatePayload.MeetingId]
	// if meetingExist {
	// 	pc, exist := meeting.PeerConnections[userId]
	// 	if exist {
	// 		err := pc.PeerConnection.SetRemoteDescription(renegotiatePayload.Offer)
	// 		if err == nil {
	// 			log.Println("Renegotiate: 30")
	// 			answer, err := pc.PeerConnection.CreateAnswer(nil)
	// 			if err == nil {
	// 				log.Println("Renegotiate: 33")
	// 				err = pc.PeerConnection.SetLocalDescription(answer)
	// 				if err == nil {
	// 					SendMessage(userId, map[string]interface{}{
	// 						"event": "answer",
	// 						"data":  answer,
	// 					})
	// 				}
	// 				return
	// 			}
	// 		}
	// 		log.Println("Renegotiate: ", err.Error())
	// SendMessage(userId, map[string]string{
	// 	"event":   "error",
	// 	"message": "Error setting local description",
	// })
	// 		return
	// 	}
	// }

}

type RenegotiatePayload struct {
	MeetingId string `json:"meetingId"`
	// Offer     webrtc.SessionDescription `json:"offer"`
}

type OfferQueue struct {
	mu      sync.Mutex
	queue   []func() error
	running bool // To prevent concurrent queue processing
}

func (oq *OfferQueue) AddToOfferQueue(task func() error) {
	oq.mu.Lock()
	defer oq.mu.Unlock()
	oq.queue = append(oq.queue, task)
}

func (oq *OfferQueue) ProcessOfferQueue() error {
	oq.mu.Lock()
	if oq.running {
		oq.mu.Unlock()
		return nil // Prevent concurrent processing
	}
	oq.running = true
	oq.mu.Unlock()

	defer func() {
		oq.mu.Lock()
		oq.running = false
		oq.mu.Unlock()
	}()

	for {
		oq.mu.Lock()
		if len(oq.queue) == 0 {
			oq.mu.Unlock()
			break
		}
		task := oq.queue[0]
		oq.queue = oq.queue[1:]
		oq.mu.Unlock()

		if err := task(); err != nil {
			log.Printf("Failed to process offer task: %v", err)
			return err
		}

		time.Sleep(time.Millisecond * 500) // Avoid overwhelming peers
	}
	return nil
}

func Offer(meetingId string, participantId string) error {
	meeting := connections[meetingId]
	peerConnection := meeting.PeerConnections[participantId].PeerConnection
	if peerConnection.SignalingState() != webrtc.SignalingStateStable {
		return nil
	}
	offer, err := peerConnection.CreateOffer(nil)
	if err != nil {
		log.Printf("Error creating offer: %v", err)
		return err
	}

	if err = peerConnection.SetLocalDescription(offer); err != nil {
		log.Printf("Error setting local description: %v", err)
		signalPeerConnections(meetingId, participantId)
		return nil
	}

	offerByte, err := json.Marshal(offer)
	if err != nil {
		log.Printf("Error marshaling offer: %v", err)
		return err
	}

	_users := make([]interface{}, 0, len(meeting.PeerConnections)-1)
	_tracks := map[string]string{}

	for k := range meeting.PeerConnections {
		participant, err := query.GetUserById(context.Background(), k)
		if err == nil {
			_users = append(_users, map[string]string{
				"name":   participant.Name,
				"userId": participant.Id,
				"email":  participant.Email,
			})
		}
	}

	meeting.TrackLocalsMap.Range(func(key, value any) bool {
		_tracks[key.(string)] = value.(string)
		return true
	})

	if err = meeting.PeerConnections[participantId].Websocket.WriteJSON(map[string]interface{}{
		"event": "offer",
		"data": map[string]interface{}{
			"offer":  string(offerByte),
			"users":  _users,
			"tracks": _tracks,
		},
	}); err != nil {
		log.Printf("Error sending offer: %v", err)
		return err
	}

	return nil
	// meeting.OfferQueue.AddToOfferQueue(func() error {

	// })

	// return processOfferQueueWithRetry(&meeting.OfferQueue)
}

func processOfferQueueWithRetry(queue *OfferQueue) error {
	err := queue.ProcessOfferQueue()
	if err != nil {
		log.Printf("Error in processing queue: %v. Retrying...", err)
		return Retry(queue.ProcessOfferQueue, 3, time.Second)
	}
	return nil
}

func Retry(fn func() error, attempts int, delay time.Duration) error {
	for i := 0; i < attempts; i++ {
		if err := fn(); err != nil {
			log.Printf("Attempt %d failed: %v", i+1, err)
			time.Sleep(delay)
			continue
		}
		return nil
	}
	return fmt.Errorf("all attempts failed")
}

// type OfferQueue struct {
// 	mu    sync.Mutex
// 	queue []func() error
// }

// func (oq *OfferQueue) AddToOfferQueue(task func() error) {
// 	oq.mu.Lock()
// 	defer oq.mu.Unlock()
// 	oq.queue = append(oq.queue, task)
// }

// func (oq *OfferQueue) ProcessOfferQueue() error {
// 	oq.mu.Lock()
// 	defer oq.mu.Unlock()
// 	for _, task := range oq.queue {
// 		if err := task(); err != nil {
// 			log.Printf("Failed to process offer task: %v", err)
// 			return err
// 		}
// 		time.Sleep(time.Millisecond * 500)
// 	}
// 	oq.queue = nil
// 	return nil
// }

// func Offer(meetingId string, participantId string) error {
// 	meeting := connections[meetingId]
// 	meeting.OfferQueue.AddToOfferQueue(func() error {
// 		offer, err := meeting.PeerConnections[participantId].PeerConnection.CreateOffer(nil)
// 		if err != nil {
// 			log.Println("22", err.Error())
// 			return err
// 		}

// 		if err = meeting.PeerConnections[participantId].PeerConnection.SetLocalDescription(offer); err != nil {
// 			log.Println("76", err.Error())
// 			signalPeerConnections(meetingId, participantId)
// 			return nil
// 		}

// 		offerByte, err := json.Marshal(offer)
// 		if err != nil {
// 			logger.Errorf("Failed to marshal offer to json: %v", err)
// 			log.Println("82", err.Error())
// 			return err
// 		}
// 		_users := make([]interface{}, 0, len(meeting.PeerConnections)-1)
// 		_tracks := map[string]string{}

// 		for k := range meeting.PeerConnections {
// 			participant, err := query.GetUserById(context.Background(), k)
// 			if err == nil {
// 				_users = append(_users, map[string]string{
// 					"name":   participant.Name,
// 					"userId": participant.Id,
// 					"email":  participant.Email,
// 				})
// 			}
// 		}

// 		meeting.TrackLocalsMap.Range(func(key, value any) bool {
// 			_tracks[key.(string)] = value.(string)
// 			return true
// 		})

// 		if err = meeting.PeerConnections[participantId].Websocket.WriteJSON(map[string]interface{}{
// 			"event": "offer",
// 			"data": map[string]interface{}{
// 				"offer":  string(offerByte),
// 				"users":  _users,
// 				"tracks": _tracks,
// 			},
// 		}); err != nil {
// 			log.Println("111", err.Error())
// 			return err
// 		}
// 		return nil
// 	})

// 	err := meeting.OfferQueue.ProcessOfferQueue()
// 	if err != nil {
// 		err = Retry(func() error {
// 			return Offer(meetingId, participantId)
// 		}, 3, time.Second)
// 		if err != nil {
// 			log.Printf("Failed to deliver offer: %v", err)
// 		}

// 	}
// 	return err
// }

// func Retry(fn func() error, attempts int, delay time.Duration) error {
// 	for i := 0; i < attempts; i++ {
// 		if err := fn(); err != nil {
// 			log.Printf("Attempt %d failed: %v", i+1, err)
// 			time.Sleep(delay)
// 			continue
// 		}
// 		return nil
// 	}
// 	return fmt.Errorf("all attempts failed")
// }
