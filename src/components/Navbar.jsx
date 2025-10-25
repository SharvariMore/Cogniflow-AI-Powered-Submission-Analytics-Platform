import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import {
  SignedIn,
  SignedOut,
  SignInButton,
  UserButton,
} from "@clerk/clerk-react";
import { useRole } from "../auth/useRole";

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { isAdmin } = useRole();

  const handleToggle = () => setMenuOpen((prev) => !prev);
  const handleLinkClick = () => setMenuOpen(false); // closes menu after clicking

  return (
    <nav className="navbar">
      <div className="nav-left">
        {/* <button onClick={handleLinkClick}>
          AI Agent App
        </button> */}

        {/* Hamburger Icon (Mobile Only) */}
        <button
          className={`menu-toggle ${menuOpen ? "open" : ""}`}
          onClick={handleToggle}
          aria-label="Toggle navigation menu"
        >
          ☰
        </button>

        <div className={`nav-links ${menuOpen ? "show" : ""}`}>
          <NavLink
            to="/"
            onClick={handleLinkClick}
            className={({ isActive }) => (isActive ? "active" : "")}
          >
            Contact Form
          </NavLink>

          <NavLink
            to="/dashboard"
            onClick={handleLinkClick}
            className={({ isActive }) => (isActive ? "active" : "")}
          >
            Dashboard
          </NavLink>

          <NavLink
            to="/analytics"
            onClick={handleLinkClick}
            className={({ isActive }) => (isActive ? "active" : "")}
          >
            Analytics
          </NavLink>
        </div>
      </div>

      {/* Right Section: Auth Buttons */}
      <div className="nav-right">
        <SignedOut>
          <SignInButton>
            <button
              className="sign-in"
              onMouseOver={(e) =>
                (e.currentTarget.style.backgroundColor = "#076eebff")
              }
              onMouseOut={(e) =>
                (e.currentTarget.style.backgroundColor = "#1e41d9cb")
              }
            >
              Sign In
            </button>
          </SignInButton>
        </SignedOut>

        <SignedIn>
          <UserButton
            appearance={{
              elements: {
                avatarBox: {
                  width: "44px",
                  height: "44px",
                },
              },
            }}
          />
        </SignedIn>
      </div>
    </nav>
  );
}
