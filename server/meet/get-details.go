package meet

import (
	"fmt"
	"google-meet/lib"
	"google-meet/middleware"
	"net/http"

	"github.com/gorilla/mux"
)

func GetMeetDetails(w http.ResponseWriter, r *http.Request) {
	_, err := middleware.CheckAuth(r)
	if err != nil {
		lib.ErrorJson(w, 403, err.Error())
		return
	}

	params := mux.Vars(r)
	roomId := params["roomId"]

	cmd := lib.RedisClient.Get(r.Context(), fmt.Sprintf("google-meet-room:%s", roomId))
	wssUrl := "wss://meet.atulmorchhlay.com/ws"
	err = cmd.Err()
	if err == nil {
		url, err := cmd.Result()
		if err == nil {
			wssUrl = url
		}
	}

	lib.WriteJson(w, http.StatusOK, map[string]interface{}{
		"message": "success",
		"data": map[string]string{
			"roomId": roomId,
			"wss":    wssUrl,
		},
	})
}

// response, err := http.Get("https://api.ipify.org")
// if err != nil {
// 	log.Fatal("Failed to get current ip");
// }
// responseData, err := io.ReadAll(response.Body)

// if err != nil {
// 	log.Fatal("Failed to get current ip");
// }
