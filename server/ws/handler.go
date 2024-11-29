package ws

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"sync"

	"github.com/gorilla/websocket"
	"github.com/pion/logging"
)

var logger = logging.NewDefaultLoggerFactory().NewLogger("sfu-ws")

var users = map[string]*threadSafeWriter{}
var wsUserMap = map[*websocket.Conn]string{}

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

func WebsocketHandler(w http.ResponseWriter, r *http.Request) {
	unsafeConn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		logger.Errorf("Failed to upgrade HTTP to Websocket: ", err)
		return
	}

	c := &threadSafeWriter{unsafeConn, sync.Mutex{}}
	defer c.Close()

	message := &WebsocketMessage{}

	keys := make([]string, 0, len(connections))
	for k := range connections {
		keys = append(keys, k)
	}
	log.Println("keys: ", keys)

	for {
		_, raw, err := c.ReadMessage()
		if err != nil {
			logger.Errorf("Failed to read message: %v", err)
			userId := wsUserMap[c.Conn]
			delete(users, userId)
			Disconnect(userId)
			return
		}

		logger.Infof("Got message: %s", raw)

		if err := json.Unmarshal(raw, &message); err != nil {

			logger.Errorf("Failed to unmarshal json to message: %v", err)
			return
		}

		switch message.Event {
		case "join-meeting":
			JoinMeeting(r.Context(), c, *message)
		case "accept-join-request":
			userId, exist := wsUserMap[c.Conn]
			if exist {
				AcceptJoinRequestHandler(r.Context(), userId, message.Data)
			}
		case "candidate":
			userId, exist := wsUserMap[c.Conn]
			if exist {
				UpdateCandidate(userId, message.Data)
			}
		case "answer":
			userId, exist := wsUserMap[c.Conn]
			if exist {
				AcceptAnswer(userId, message.Data)
			}
		case "leave":
			userId := wsUserMap[c.Conn]
			delete(users, userId)
			Disconnect(userId)
		}
	}
}

func SendMessage(userId string, data interface{}) error {
	user, exist := users[userId]
	if exist {
		return user.WriteJSON(data)
	}
	return errors.New("user not found")
}

type threadSafeWriter struct {
	*websocket.Conn
	sync.Mutex
}

type WebsocketMessage struct {
	Event string `json:"event"`
	Data  string `json:"data"`
}

// type User struct {
// 	MeetingId string
// 	WebSocket *threadSafeWriter
// }

func (t *threadSafeWriter) WriteJSON(v interface{}) error {
	t.Lock()
	defer t.Unlock()

	return t.Conn.WriteJSON(v)
}
