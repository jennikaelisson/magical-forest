import { NavLink } from "react-router-dom";
import "../style/Login.css";
import { useEffect, useState } from "react";
import { useUser } from "../context/UserContext";

export const Login = () => {
  //KATODO: behöver lägga till om emailen inte finns i databasen behöver användaren veta det och få förslag om att registrera sig istället

  const url = "http://localhost:3000/api/users/login";
  const successUrl = "MyPage";

  const { user, setUser } = useUser();
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");

  const handleInputEmail = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
  };

  const handleInputPassword = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
  };

  const handleClick = async () => {
    if (!email || !password) {
      setErrorMessage("Both email and password fields are required!");
      return;
    }
    try {
      const result = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email,
          password: password,
        }),
      });
      const resultData = await result.json();

      if (resultData.isLoggedIn) {
        document.location.href = successUrl;
        setUser(email);
        console.log("Signed in");
      } else {
        setErrorMessage("Incorrect email or password");
        console.log("Couldn't sign in");
      }
    } catch (error) {
      alert("Something went wrong!");
    }
  };

  useEffect(() => {
    console.log("Logged in user", user); // Använd useEffect för att lyssna på förändringar i user
  }, [user]);

  return (
    <div className="container">
      <div className="form-container">
        <h2>Login</h2>
        <div>
          <label htmlFor="email">Email</label>
          <input
            type="email"
            name="email"
            id="email"
            onChange={handleInputEmail}
            value={email}
            required
          />
        </div>
        <div>
          <label htmlFor="password">Password</label>
          <input
            type="password"
            name="password"
            id="password"
            onChange={handleInputPassword}
            value={password}
            required
          />
        </div>{errorMessage && <p >{errorMessage}</p>}
        <button onClick={handleClick}>Login</button>
      </div>
      <div>
        <h4>
          Not yet a member?{" "}
          <NavLink to="/register" className="register-link">
            Register
          </NavLink>
        </h4>
      </div>
    </div>
  );
};
