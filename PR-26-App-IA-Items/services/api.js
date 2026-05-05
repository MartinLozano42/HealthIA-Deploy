const API_URL = "http://localhost:3000";

export const loginUser = async (email, password) => {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      password,
    }),
  });

  if (!response.ok) {
    throw new Error("Credenciales incorrectas");
  }

  return response.json();
};

export const registerUser = async (name, email, password) => {
  try {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        email,
        password,
      }),
    });

    return await response.json();
  } catch (error) {
    console.log("Error register:", error);
  }
};
export const saveStats = async (stats) => {
  const response = await fetch(`${API_URL}/stats`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(stats),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Error saving stats");
  }

  return data;
};

export const updateUserStatus = async (id, status) => {
  const res = await fetch(`${API_URL}/users/${id}/status`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  return res.json();
};
export const getUsers = async () => {
  const res = await fetch(`${API_URL}/users`);
  return res.json();
};
