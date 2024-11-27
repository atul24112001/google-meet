package ws

import (
	"sync"

	"github.com/pion/webrtc/v4"
)

type PeerConnectionState struct {
	PeerConnection *webrtc.PeerConnection
	Websocket      *threadSafeWriter
}

type Connection struct {
	// lock for PeerConnections and TrackLocals
	ListLock        sync.RWMutex
	TrackLocals     map[string]*webrtc.TrackLocalStaticRTP
	PeerConnections map[string]PeerConnectionState
}

var connections = map[string]*Connection{}

// func ()
