package meet

import (
	"net/http"
)

func CreateMeet(w http.ResponseWriter, r *http.Request) {
	// user, err := middleware.CheckAuth(r)
	// if err != nil {
	// 	lib.ErrorJson(w, 403, err.Error())
	// 	return
	// }

	// meetId, err := uuid.NewRandom()
	// if err != nil {
	// 	lib.ErrorJson(w, http.StatusInternalServerError, "Error while creating id")
	// 	return
	// }

	// var meet model.Meet
	// t := time.Now()
	// formattedTime := t.Format("2006-01-02 15:04:05.000")

	// err = lib.Pool.QueryRow(r.Context(), `INSERT INTO public.meets (id, "startsAt", "userId") VALUES ($1, $2, $3) RETURNING (id, "startsAt", "userId")`).Scan(&meet.Id)
}
