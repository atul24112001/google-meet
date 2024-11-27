package main

import "log"

type User struct {
	email string
	name  string
}

func (u *User) changeName(name string) {
	u.name = name
}

func main() {
	user := User{
		email: "atul@gmail.com",
		name:  "atul",
	}

	user.changeName("Shubham")
	log.Println(user.name)
}
