package ws

import (
	"context"
	"encoding/json"
)

func AcceptJoinRequestHandler(ctx context.Context, userId string, payload string) {
	var data JoinMeetingRequest
	err := json.Unmarshal([]byte(payload), &data)
	if err != nil {
		SendMessage(userId, map[string]string{
			"event":   "error",
			"message": "Error while parsing accept join request payload",
		})
		return
	}
	JoinMeetingRequestHandler(ctx, data.MeetingId, data.UserId, data.Audio, data.Video)
	for k := range connections[data.MeetingId].PeerConnections {
		if k != userId && k != data.UserId {
			SendMessage(userId, map[string]interface{}{
				"event": "new-participant",
				"data": map[string]string{
					"name":   data.Name,
					"userId": data.UserId,
					"email":  data.Email,
				},
			})
		}
	}

}
