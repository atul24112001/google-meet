package ws

import "encoding/json"

type ChangeTrackType struct {
	MeetingId string `json:"meetingId"`
	Audio     bool   `json:"audio"`
	Video     bool   `json:"video"`
}

func ChangeTrack(userId string, payload string) (string, error) {
	var changeTrackType ChangeTrackType
	if err := json.Unmarshal([]byte(payload), &changeTrackType); err != nil {
		SendMessage(userId, map[string]string{
			"event":   "error",
			"message": "Something went wrong while changing track",
		})
		return changeTrackType.MeetingId, err
	}

	// connections[changeTrackType.MeetingId].PeerConnections[userId].Audio = changeTrackType.Audio
	// connections[changeTrackType.MeetingId].PeerConnections[userId].Video = changeTrackType.Video
	return changeTrackType.MeetingId, nil
}
