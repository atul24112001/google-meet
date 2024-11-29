package ws

import "log"

func Disconnect(userId string) {
	for meetId, connection := range connections {
		_, exist := connection.PeerConnections[userId]
		if exist {
			connections[meetId].PeerConnections[userId].PeerConnection.GracefulClose()
			delete(connections[meetId].PeerConnections, userId)

			keys := make([]string, 0, len(connections[meetId].PeerConnections))
			for k := range connections[meetId].PeerConnections {
				keys = append(keys, k)
			}

			log.Println(keys, "=========================")
			if len(keys) == 0 {
				connections[meetId].ListLock.Lock()
				defer connections[meetId].ListLock.Unlock()

				for id, _ := range connections[meetId].TrackLocals {
					delete(connections[meetId].TrackLocals, id)
				}

				for id, pcState := range connections[meetId].PeerConnections {
					if pcState != nil && pcState.PeerConnection != nil {
						pcState.PeerConnection.Close()
					}
					delete(connections[meetId].PeerConnections, id)
				}
				connections[meetId].TrackLocals = nil
				connections[meetId].PeerConnections = nil
				delete(connections, meetId)
				return
			}

			for _, pcs := range connections[meetId].PeerConnections {
				pcs.Websocket.WriteJSON(map[string]interface{}{
					"event": "disconnect",
					"data": map[string]string{
						"meetId": meetId,
						"userId": userId,
					},
				})
			}
		}
	}
}
