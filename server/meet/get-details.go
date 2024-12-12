package meet

import (
	"google-meet/lib"
	"google-meet/middleware"
	"google-meet/query"
	"net/http"
	"os"

	"github.com/google/uuid"
	"github.com/gorilla/mux"
)

func GetMeetDetails(w http.ResponseWriter, r *http.Request) {
	_, err := middleware.CheckAuth(r)
	if err != nil {
		lib.ErrorJson(w, 403, err.Error())
		return
	}

	params := mux.Vars(r)
	meetId, err := uuid.Parse(params["meetId"])
	if err != nil {
		lib.ErrorJson(w, http.StatusInternalServerError, err.Error())
		return
	}
	wssUrl := os.Getenv("SERVER_HOST")

	// redisKey := fmt.Sprintf("google-meet:host:%s", meetId.String())

	meet, err := query.GetMeetingById(r.Context(), meetId.String())
	if err != nil {
		lib.ErrorJson(w, http.StatusInternalServerError, err.Error())
		return
	}

	// if meet.Type == "meeting" {
	// 	cmd := lib.RedisClient.Get(r.Context(), redisKey)
	// 	err = cmd.Err()
	// 	if err == nil {
	// 		url, err := cmd.Result()
	// 		if err == nil {
	// 			wssUrl = url
	// 		}
	// 	}
	// }

	// if user.Id == meet.UserId {
	// 	meet.AllowAudio = true;
	// 	meet.AllowVideo = true;
	// 	meet.AllowScreen = true;
	// }

	lib.WriteJson(w, http.StatusOK, map[string]interface{}{
		"message": "success",
		"data": map[string]interface{}{
			"meetId":      meetId,
			"wss":         wssUrl,
			"hostId":      meet.UserId,
			"allowAudio":  meet.AllowAudio,
			"allowVideo":  meet.AllowVideo,
			"allowScreen": meet.AllowScreen,
		},
	})
}
