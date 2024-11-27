package ws

import (
	"encoding/json"

	"github.com/pion/webrtc/v4"
)

type UpdateCandidatePayload struct {
	Candidate webrtc.ICECandidateInit `json:"candidate"`
	MeetId    string                  `json:"meetId"`
}

func UpdateCandidate(userId string, message string) {
	user, exist := users[userId]
	if !exist {
		return
	}
	var updateCandidatePayload UpdateCandidatePayload
	if err := json.Unmarshal([]byte(message), &updateCandidatePayload); err != nil {
		user.WriteJSON(map[string]string{
			"event":   "error",
			"message": "Something went wrong while parsing data",
		})
		return
	}
	meets, exist := connections[updateCandidatePayload.MeetId]
	if !exist {
		user.WriteJSON(map[string]string{
			"event":   "error",
			"message": "Meeting doesn't exist",
		})
		return
	}

	if err := meets.PeerConnections[userId].PeerConnection.AddICECandidate(updateCandidatePayload.Candidate); err != nil {
		user.WriteJSON(map[string]string{
			"event":   "error",
			"message": "Something went wrong while adding ice candidates",
		})
	}
}
