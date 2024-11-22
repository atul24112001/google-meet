package auth

import (
	"google-meet/lib"
	"google-meet/model"
	"net/http"

	"github.com/jackc/pgx/v5"
)

type SigninPayload struct {
	Email    string `json:"email"`
	Password string `json:"Password"`
}

func Signin(w http.ResponseWriter, r *http.Request) {
	var body SigninPayload
	if err := lib.ReadJsonFromBody(w, r, body); err != nil {
		lib.ErrorJson(w, http.StatusBadRequest, err.Error())
		return
	}

	var user model.User
	if err := lib.Pool.QueryRow(r.Context(), "SELECT (id, name, email, password) FROM public.users WHERE email =  $1", body.Email).Scan(&user.Id, &user.Name, &user.Email, &user.Password); err != nil {
		if err == pgx.ErrNoRows {
			lib.ErrorJson(w, http.StatusUnauthorized, "No user found with this email")
			return
		}
		lib.ErrorJson(w, http.StatusInternalServerError, err.Error())
		return
	}

	hashedPassword := lib.HashString(body.Password)
	if hashedPassword != user.Password {
		lib.ErrorJson(w, http.StatusUnauthorized, "Invalid password")
		return
	}

	token, err := lib.GenerateToken(user.Id)
	if err != nil {
		lib.ErrorJson(w, http.StatusInternalServerError, err.Error())
		return
	}

	lib.WriteJson(w, http.StatusOK, map[string]interface{}{
		"message": "User signed up successful",
		"data": map[string]string{
			"id":    user.Id,
			"name":  user.Name,
			"email": user.Email,
		},
		"token": token,
	})
}
