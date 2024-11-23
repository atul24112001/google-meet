package auth

import (
	"google-meet/lib"
	"google-meet/model"
	"net/http"

	"github.com/jackc/pgx/v5"
)

type CheckEmailPayload struct {
	Email string `json:"email"`
}

func CheckEmail(w http.ResponseWriter, r *http.Request) {
	var body CheckEmailPayload
	if err := lib.ReadJsonFromBody(w, r, &body); err != nil {
		lib.ErrorJson(w, http.StatusBadRequest, err.Error())
		return
	}

	var user model.User
	if err := lib.Pool.QueryRow(r.Context(), "SELECT id FROM public.users WHERE email =  $1", body.Email).Scan(&user.Id); err != nil {
		if err == pgx.ErrNoRows {
			lib.ErrorJson(w, http.StatusUnauthorized, "No user found with this email")
			return
		}
		lib.ErrorJson(w, http.StatusInternalServerError, err.Error())
		return
	}

	lib.WriteJson(w, http.StatusOK, map[string]interface{}{
		"message": "account exist",
	})
}
