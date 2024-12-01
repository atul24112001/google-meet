package ws

import (
	"encoding/json"
	"log"

	"github.com/pion/webrtc/v4"
)

type AcceptAnswerPayload struct {
	Answer webrtc.SessionDescription `json:"answer"`
	MeetId string                    `json:"meetId"`
	Audio  bool                      `json:"audio"`
	Video  bool                      `json:"video"`
}

func AcceptAnswer(userId string, message string) {
	user, exist := SafeReadFromUsers(userId)
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

	_, pcExist := meeting.PeerConnections[userId]

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

	meeting.PeerConnections[userId].Audio = acceptAnswerPayload.Audio
	meeting.PeerConnections[userId].Video = acceptAnswerPayload.Video
}
