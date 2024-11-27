package ws

import (
	"github.com/pion/rtp"
	"github.com/pion/webrtc/v4"
)

func TrackHandler(tr *webrtc.TrackRemote, meetingId string, userId string) {
	logger.Infof("Got remote track: MeetId=%s Kind=%s, ID=%s, PayloadType=%d", meetingId, tr.Kind(), tr.ID(), tr.PayloadType())

	trackLocal := addTrack(tr, meetingId, userId)
	defer removeTrack(trackLocal, meetingId, userId)

	buf := make([]byte, 1500)
	rtpPkt := &rtp.Packet{}

	for {
		i, _, err := tr.Read(buf)
		if err != nil {
			return
		}

		if err = rtpPkt.Unmarshal(buf[:i]); err != nil {
			logger.Errorf("Failed to unmarshal incoming RTP packet: %v", err)
			return
		}

		rtpPkt.Extension = false
		rtpPkt.Extensions = nil

		if err = trackLocal.WriteRTP(rtpPkt); err != nil {
			return
		}
	}
}

// Add to list of tracks and fire renegotation for all PeerConnections
func addTrack(t *webrtc.TrackRemote, meetingId string, userId string) *webrtc.TrackLocalStaticRTP {
	meeting := connections[meetingId]

	meeting.ListLock.Lock()
	defer func() {
		meeting.ListLock.Unlock()
		signalPeerConnections(meetingId, userId)
	}()

	// Create a new TrackLocal with the same codec as our incoming
	trackLocal, err := webrtc.NewTrackLocalStaticRTP(t.Codec().RTPCodecCapability, t.ID(), t.StreamID())
	if err != nil {
		panic(err)
	}

	meeting.TrackLocals[t.ID()] = trackLocal
	return trackLocal
}

// Remove from list of tracks and fire renegotation for all PeerConnections
func removeTrack(t *webrtc.TrackLocalStaticRTP, meetingId string, userId string) {
	meeting := connections[meetingId]
	meeting.ListLock.Lock()
	defer func() {
		meeting.ListLock.Unlock()
		signalPeerConnections(meetingId, userId)
	}()

	delete(meeting.TrackLocals, t.ID())
}
