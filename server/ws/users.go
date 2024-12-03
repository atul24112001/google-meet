package ws

import "sync"

var _users = make(map[string]*threadSafeWriter)
var _usersMutex sync.Mutex

func SafeWriteToUsers(key string, value *threadSafeWriter) {
	_usersMutex.Lock()
	defer _usersMutex.Unlock()
	_users[key] = value
}

func SafeUpdateMeetingToUsers(key string, meetingId string) {
	user, exist := SafeReadFromUsers(key)
	if exist {
		user.MeetingId = meetingId
		SafeWriteToUsers(key, user)
	}

}

func SafeDeleteFromUsers(key string) {
	_usersMutex.Lock()
	defer _usersMutex.Unlock()
	delete(_users, key)
}

func SafeReadFromUsers(key string) (*threadSafeWriter, bool) {
	_usersMutex.Lock()
	defer _usersMutex.Unlock()
	value, exists := _users[key]
	return value, exists
}
