package ws

import (
	"context"
	"encoding/json"
	"log"

	"github.com/pion/webrtc/v4"
)

func HandleOffer(ctx context.Context, userId string, payload string) {
	user, exist := SafeReadFromUsers(userId)
	if !exist {
		return
	}
	var offerPayload OfferPayload
	if err := json.Unmarshal([]byte(payload), &offerPayload); err != nil {
		user.WriteJSON(map[string]string{
			"event":   "error",
			"message": "Something went wrong while parsing data",
		})
		return
	}
	meeting, meetingExist := connections[offerPayload.MeetingId]
	if meetingExist {
		pc, exist := meeting.PeerConnections[userId]
		if exist {
			if pc.PeerConnection.SignalingState() != webrtc.SignalingStateStable {
				log.Println("Returning because of signaling state")
				return
			}
			err := pc.PeerConnection.SetRemoteDescription(offerPayload.Offer)
			if err == nil {
				log.Println("Renegotiate: 30")
				answer, err := pc.PeerConnection.CreateAnswer(nil)
				if err == nil {
					log.Println("Renegotiate: 33")
					err = pc.PeerConnection.SetLocalDescription(answer)
					if err == nil {
						_answer, err := json.Marshal(answer)
						if err == nil {
							SendMessage(userId, map[string]interface{}{
								"event": "answer",
								"data":  string(_answer),
							})
						}
					}
					return
				}
			}
			log.Println("Renegotiate: ", err.Error())
			SendMessage(userId, map[string]string{
				"event":   "error",
				"message": "Error setting local description",
			})
			return
		}
	}
}

type OfferPayload struct {
	MeetingId string                    `json:"meetingId"`
	Offer     webrtc.SessionDescription `json:"offer"`
}
