package ws

import (
	"google-meet/lib"
	"net/http"
	"sync"

	"github.com/pion/webrtc/v4"
)

type PeerConnectionState struct {
	PeerConnection *webrtc.PeerConnection
	Websocket      *threadSafeWriter
	Audio          bool
	Video          bool
}

type Connection struct {
	// lock for PeerConnections and TrackLocals
	ListLock        sync.RWMutex
	TrackLocals     map[string]*webrtc.TrackLocalStaticRTP
	PeerConnections map[string]*PeerConnectionState
	TrackLocalsMap  sync.Map
}

var connections = map[string]*Connection{}

// func ()

func GetConnections(w http.ResponseWriter, r *http.Request) {

	meetings := make([]interface{}, 0, len(connections))
	for meeting, c := range connections {
		pcs := make([]string, 0, len(c.PeerConnections))
		for k2 := range c.PeerConnections {
			pcs = append(pcs, k2)
		}

		meetings = append(meetings, map[string]interface{}{
			"meeting": meeting,
			"pcs":     pcs,
		})
	}

	lib.WriteJson(w, 200, map[string]interface{}{
		"meetings": meetings,
	})
}
