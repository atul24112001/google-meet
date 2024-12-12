package meet

import (
	"google-meet/lib"
	"google-meet/middleware"
	"google-meet/query"
	"net/http"

	"github.com/google/uuid"
	"github.com/gorilla/mux"
)

type UpdateMeetDetailsPayload struct {
	AllowAudio  bool `json:"allowAudio"`
	AllowVideo  bool `json:"allowVideo"`
	AllowScreen bool `json:"allowScreen"`
}

func UpdateMeetDetails(w http.ResponseWriter, r *http.Request) {
	user, err := middleware.CheckAuth(r)
	if err != nil {
		lib.ErrorJson(w, 403, err.Error())
		return
	}

	var updateMeetDetailsPayload UpdateMeetDetailsPayload
	err = lib.ReadJsonFromBody(w, r, &updateMeetDetailsPayload)
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

	meet, err := query.GetMeetingById(r.Context(), meetId.String())
	if err != nil {
		lib.ErrorJson(w, http.StatusInternalServerError, err.Error())
		return
	}

	if meet.UserId != user.Id {
		lib.ErrorJson(w, 403, "Unauthorized")
		return
	}

	_, err = lib.Pool.Exec(r.Context(), `UPDATE public.meets SET "allowAudio" = $2, "allowVideo" = $3, "allowScreen" = $4 WHERE id = $1`, meetId, updateMeetDetailsPayload.AllowAudio, updateMeetDetailsPayload.AllowVideo, updateMeetDetailsPayload.AllowScreen)
	if err != nil {
		lib.ErrorJson(w, http.StatusInternalServerError, err.Error())
		return
	}

	lib.WriteJson(w, http.StatusOK, map[string]string{
		"message": "Success",
	})
}
