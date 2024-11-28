package ws

import (
	"encoding/json"
	"log"

	"github.com/pion/webrtc/v4"
)

type AcceptAnswerPayload struct {
	Answer webrtc.SessionDescription `json:"answer"`
	MeetId string                    `json:"meetId"`
}

func AcceptAnswer(userId string, message string) {
	user, exist := users[userId]
	if !exist {
		return
	}
	var acceptAnswerPayload AcceptAnswerPayload
	if err := json.Unmarshal([]byte(message), &acceptAnswerPayload); err != nil {
		user.WriteJSON(map[string]string{
			"event":   "error",
			"message": "Something went wrong while parsing data",
		})
		return
	}
	meeting, exist := connections[acceptAnswerPayload.MeetId]
	if !exist {
		user.WriteJSON(map[string]string{
			"event":   "error",
			"message": "Meeting doesn't exist",
		})
		return
	}

	log.Println(meeting.PeerConnections)
	_, pcExist := meeting.PeerConnections[userId]

	log.Println("pcExist", pcExist)
	if !pcExist || meeting.PeerConnections[userId].PeerConnection == nil {
		user.WriteJSON(map[string]string{
			"event":   "error",
			"message": "Peer connection not found or not initialized",
		})
		return
	}
	if err := meeting.PeerConnections[userId].PeerConnection.SetRemoteDescription(acceptAnswerPayload.Answer); err != nil {
		log.Println(err.Error(), acceptAnswerPayload.Answer)
		user.WriteJSON(map[string]string{
			"event":   "error",
			"message": "Something went wrong while setting remote description",
		})
	}

}
