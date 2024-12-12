package ws

import (
	"context"
	"google-meet/query"
)

func TextMessageHandler(ctx context.Context, userId string, message string) {
	localUser, exist := SafeReadFromUsers(userId)

	user, err := query.GetUserById(ctx, userId)
	if err == nil && exist {
		meeting, exist := connections[localUser.MeetingId]
		if exist {
			for k, _ := range meeting.PeerConnections {
				SendMessage(k, map[string]interface{}{
					"event": "text-message",
					"data": map[string]string{
						"userId":  userId,
						"message": message,
						"name":    user.Name,
					},
				})
			}
			return
		}
	}
	SendMessage(userId, map[string]string{
		"event":   "error",
		"message": "Error while fetching details",
	})
}
