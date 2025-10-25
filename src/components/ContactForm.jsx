import React, { useState } from "react";

const API_BASE = "http://localhost:5678";

function ContactForm() {
  const [status, setStatus] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [alertType, setAlertType] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    const name = e.target.name.value;
    const email = e.target.email.value;

    setIsLoading(true);
    setStatus("");
    setAlertType("");

    try {
      const res = await fetch(`${API_BASE}/webhook/react-contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email }),
      });

      const contentType = res.headers.get("Content-Type");

      if (res.ok && contentType && contentType.includes("application/json")) {
        const data = await res.json();
        setStatus(data.message || "Submitted successfully!");
        setAlertType("success");
        e.target.reset();
        setTimeout(() => {
          setStatus("");
          setAlertType("");
        }, 5000);
      } else {
        const text = await res.text();
        console.error("Unexpected response: ", text);
        setStatus("Unexpected response from server!");
        setAlertType("error");
      }
    } catch (err) {
      console.error("Network error:", err);
      setStatus("Something went wrong.");
      setAlertType("error");
    }

    setIsLoading(false);
  }

  return (
    <div className="form-container">
      <form onSubmit={handleSubmit} className="contact-form">
        <h2>Contact Form</h2>
        <label>
          Full Name:
          <input name="name" type="text" required placeholder="Enter Your Full Name" />
        </label>
        <label>
          Email:
          <input name="email" type="email" required placeholder="Enter Your Email" />
        </label>
        <button type="submit" disabled={isLoading}>
          {isLoading ? "Submitting..." : "Submit"}
        </button>
        {status && <p className={`status-message ${alertType}`}>{status}</p>}
      </form>
    </div>
  );
}

export default ContactForm;
