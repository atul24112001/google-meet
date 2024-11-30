package ws

func Disconnect(userId string) {
	for meetId, connection := range connections {
		_, exist := connection.PeerConnections[userId]
		if exist {
			connection.ListLock.Lock()
			defer connection.ListLock.Unlock()

			if connection.PeerConnections != nil {
				if connection.PeerConnections[userId] != nil {
					connection.PeerConnections[userId].PeerConnection.GracefulClose()
				}
			}
			delete(connection.PeerConnections, userId)

			keys := make([]string, 0, len(connection.PeerConnections))
			for k := range connection.PeerConnections {
				keys = append(keys, k)
			}

			if len(keys) == 0 {
				for id, _ := range connection.TrackLocals {
					delete(connection.TrackLocals, id)
				}

				for id, pcState := range connection.PeerConnections {
					if pcState != nil && pcState.PeerConnection != nil {
						pcState.PeerConnection.Close()
					}
					delete(connection.PeerConnections, id)
				}
				connection.TrackLocals = nil
				connection.PeerConnections = nil
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
