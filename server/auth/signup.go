package auth

import (
	"google-meet/lib"
	"google-meet/model"
	"log"
	"net/http"

	"github.com/google/uuid"
)

type SignupPayload struct {
	Name     string `json:"name"`
	Email    string `json:"email"`
	Password string `json:"password"`
}

func Signup(w http.ResponseWriter, r *http.Request) {
	var body SignupPayload
	if err := lib.ReadJsonFromBody(w, r, &body); err != nil {
		lib.ErrorJson(w, http.StatusBadRequest, err.Error())
		return
	}
	log.Println("Password length", len(body.Password), body)
	if len(body.Password) < 8 || len(body.Password) > 15 {
		lib.ErrorJson(w, http.StatusInternalServerError, "Password's length should be between 8 to 15")
		return
	}

	password := lib.HashString(body.Password)

	var user model.User

	userId, err := uuid.NewRandom()
	if err != nil {
		lib.ErrorJson(w, http.StatusInternalServerError, "Error creating userId")
		return
	}

	if err := lib.Pool.QueryRow(r.Context(), "INSERT INTO public.users (id, name, email, password) VALUES ($1, $2, $3, $4) RETURNING id, name, email, password", userId.String(), body.Name, body.Email, password).Scan(&user.Id, &user.Name, &user.Email, &user.Password); err != nil {
		lib.ErrorJson(w, http.StatusInternalServerError, err.Error())
		return
	}

	token, err := lib.GenerateToken(user.Id)
	if err != nil {
		lib.ErrorJson(w, http.StatusInternalServerError, err.Error())
		return
	}

	// cookie := http.Cookie{
	// 	Name:     "token",
	// 	Value:    token,
	// 	Path:     "/",
	// 	Domain:   "localhost",
	// 	HttpOnly: true,
	// 	Secure:   true,
	// 	SameSite: http.SameSiteLaxMode,
	// 	MaxAge:   3600 * 24 * 30,
	// }
	// http.SetCookie(w, &cookie)

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
