import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import SubmissionsDashboard from "../components/SubmissionsDashboard";

jest.mock("@clerk/clerk-react", () => ({
  useUser: () => ({ user: { id: "123", firstName: "Test" }, isSignedIn: true }),
  ClerkProvider: ({ children }) => <>{children}</>,
}));

// Mock useRole hook
jest.mock("../auth/useRole", () => ({
  useRole: () => ({ isAdmin: true }),
}));

// Mock date-fns functions to avoid actual timing issues
jest.mock("date-fns", () => ({
  ...jest.requireActual("date-fns"),
  format: jest.fn((d, fmt) => "01/01/2025"),
  formatDistanceToNowStrict: jest.fn(() => "1 day"),
  isToday: jest.fn(() => true),
  parseISO: jest.requireActual("date-fns").parseISO,
  parse: jest.requireActual("date-fns").parse,
}));

// Mock export utils (not needed for delete tests)
jest.mock("../utils/exportUtils", () => ({
  exportToCSV: jest.fn(),
  exportToXLSX: jest.fn(),
  exportTablePDF: jest.fn(),
}));

// Mock fetch globally
beforeEach(() => {
  global.fetch = jest.fn();
  jest.spyOn(window, "alert").mockImplementation(() => {});
  jest.spyOn(window, "confirm").mockImplementation(() => true);
});

afterEach(() => {
  jest.resetAllMocks();
});

const mockSubmissions = [
  { id: "1", name: "Alice", email: "alice@example.com", date: "2025-01-01" },
  { id: "2", name: "Bob", email: "bob@example.com", date: "2025-01-02" },
];

test("successful delete removes item and shows success message", async () => {
  // Mock initial fetch
  fetch.mockResolvedValueOnce({
    ok: true,
    json: async () => mockSubmissions,
  });

  // Mock delete API call
  fetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ ok: true }),
  });

  render(<SubmissionsDashboard />);

  // Wait for table to render
  await screen.findByText("Alice");

  const deleteButtons = screen.getAllByText("Delete");
  fireEvent.click(deleteButtons[0]);

  // Should call fetch with correct delete URL
  await waitFor(() => {
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining(
        `${
          process.env.REACT_APP_API_BASE || "http://localhost:5678"
        }/webhook/delete-submission?id=1`
      ),
      expect.objectContaining({ method: "POST" })
    );
  });

  // Alice should be removed from table
  await waitFor(() => {
    expect(screen.queryByText("Alice")).not.toBeInTheDocument();
  });

  // Success message should appear
  expect(screen.getByText("Record Deleted Successfully!")).toBeInTheDocument();
});

test("cancelled delete does not call API", async () => {
  window.confirm.mockImplementationOnce(() => false);

  fetch.mockResolvedValueOnce({
    ok: true,
    json: async () => mockSubmissions,
  });

  render(<SubmissionsDashboard />);
  await screen.findByText("Alice");

  fireEvent.click(screen.getAllByText("Delete")[0]);

  expect(fetch).toHaveBeenCalledTimes(1); // only initial fetch
  expect(screen.getByText("Alice")).toBeInTheDocument();
});

test("delete API failure rolls back and shows alert", async () => {
  fetch.mockResolvedValueOnce({
    ok: true,
    json: async () => mockSubmissions,
  });

  // Delete fails
  fetch.mockResolvedValueOnce({
    ok: false,
    statusText: "Internal Server Error",
    json: async () => ({ ok: false, error: "Delete failed!" }),
  });

  render(<SubmissionsDashboard />);
  await screen.findByText("Alice");

  fireEvent.click(screen.getAllByText("Delete")[0]);

  await waitFor(() => {
    expect(screen.getByText("Alice")).toBeInTheDocument(); // rollback
    // eslint-disable-next-line testing-library/no-wait-for-multiple-assertions
    expect(window.alert).toHaveBeenCalledWith("Delete failed!");
  });
});

test("network error during delete rolls back and shows alert", async () => {
  fetch.mockResolvedValueOnce({
    ok: true,
    json: async () => mockSubmissions,
  });

  fetch.mockRejectedValueOnce(new Error("Network Error"));

  render(<SubmissionsDashboard />);
  await screen.findByText("Alice");

  fireEvent.click(screen.getAllByText("Delete")[0]);

  await waitFor(() => {
    expect(screen.getByText("Alice")).toBeInTheDocument(); // rollback
    // eslint-disable-next-line testing-library/no-wait-for-multiple-assertions
    expect(window.alert).toHaveBeenCalledWith("Network error during delete!");
  });
});
