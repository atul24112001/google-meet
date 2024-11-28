package ws

func Disconnect(userId string) {
	for meetId, connection := range connections {
		_, exist := connection.PeerConnections[userId]
		if exist {
			// pc.PeerConnection.Close()
			// delete(connection.PeerConnections, userId)
			// signalPeerConnections(meetId, userId, false, false)
			for _, pcs := range connection.PeerConnections {
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
