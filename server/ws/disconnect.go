package ws

import (
	"log"

	"github.com/gorilla/websocket"
)

func Disconnect(conn *websocket.Conn) {
	userId := wsUserMap[conn]
	user, userExist := SafeReadFromUsers(userId)
	if userExist {
		meetId := user.MeetingId
		log.Println("Disconnecting: ", userId, meetId)

		if meetId != "" {
			connection, connectionExist := connections[meetId]
			if !connectionExist {
				log.Println("Connections ")
				return
			}
			_, userExistInMeeting := connection.PeerConnections[userId]
			if userExistInMeeting {
				connection.ListLock.Lock()
				defer connection.ListLock.Unlock()
				log.Println("Disconnecting 30")
				if connection.PeerConnections != nil {
					if connection.PeerConnections[userId] != nil {
						connection.PeerConnections[userId].PeerConnection.GracefulClose()
					}
				}

				log.Println("Disconnecting 37")
				streams := []string{}
				connection.TrackLocalsMap.Range(func(key, value any) bool {
					if value == userId {
						streams = append(streams, key.(string))
					}
					return true
				})
				delete(connection.PeerConnections, userId)

				for _, streamId := range streams {
					connection.TrackLocalsMap.Delete(streamId)
					delete(connection.TrackLocals, streamId)
				}

				keys := []string{}
				for k := range connection.PeerConnections {
					keys = append(keys, k)
				}

				if len(keys) == 0 {
					for id, _ := range connection.TrackLocals {
						delete(connection.TrackLocals, id)
					}

					connection.TrackLocals = nil
					connection.PeerConnections = nil
					delete(connections, meetId)
					return
				}
				log.Println("Disconnecting 68")
				for userId, pcs := range connections[meetId].PeerConnections {
					log.Println("Disconnecting 70", userId)
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
	delete(wsUserMap, conn)
	SafeDeleteFromUsers(userId)
	log.Println("Deleted", userId)
}
