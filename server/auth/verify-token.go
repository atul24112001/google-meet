package auth

import (
	"google-meet/lib"
	"google-meet/middleware"
	"net/http"
)

func VerifyToken(w http.ResponseWriter, r *http.Request) {
	user, err := middleware.CheckAuth(r)
	if err != nil {
		lib.ErrorJson(w, 403, err.Error())
		return
	}
	lib.WriteJson(w, http.StatusOK, map[string]interface{}{
		"message": "success",
		"data": map[string]string{
			"id":    user.Id,
			"name":  user.Name,
			"email": user.Email,
		},
	})
}
