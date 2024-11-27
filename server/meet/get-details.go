package meet

import (
	"fmt"
	"google-meet/lib"
	"google-meet/middleware"
	"google-meet/model"
	"net/http"
	"time"

	"github.com/gorilla/mux"
)

func GetMeetDetails(w http.ResponseWriter, r *http.Request) {
	_, err := middleware.CheckAuth(r)
	if err != nil {
		lib.ErrorJson(w, 403, err.Error())
		return
	}

	params := mux.Vars(r)
	meetId := params["meetId"]

	cmd := lib.RedisClient.Get(r.Context(), fmt.Sprintf("google-meet-room:%s", meetId))
	wssUrl := "wss://meet.atulmorchhlay.com/ws"
	err = cmd.Err()
	if err == nil {
		url, err := cmd.Result()
		if err == nil {
			wssUrl = url
		}
	}

	var meet model.Meet
	err = lib.Pool.QueryRow(r.Context(), `SELECT id, "userId" FROM public.meets WHERE id = $1`, meetId).Scan(&meet.Id, &meet.UserId)
	if err != nil {
		lib.ErrorJson(w, http.StatusInternalServerError, err.Error())
		return
	}

	lib.RedisClient.Set(r.Context(), fmt.Sprintf("meet-%s", meetId), meet.UserId, time.Hour*24)
	lib.WriteJson(w, http.StatusOK, map[string]interface{}{
		"message": "success",
		"data": map[string]string{
			"meetId": meetId,
			"wss":    wssUrl,
			"hostId": meet.UserId,
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
