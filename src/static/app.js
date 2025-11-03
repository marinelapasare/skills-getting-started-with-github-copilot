document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // small helper to avoid inserting raw HTML into card fields
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // helper to compute initials for avatar
  function getInitials(name) {
    if (!name) return "";
    const parts = String(name).trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message and previous content
      activitiesList.innerHTML = "";

      // Clear and reset activity select to avoid duplicates
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        activityCard.innerHTML = `
          <h4>${escapeHtml(name)}</h4>
          <p>${escapeHtml(details.description)}</p>
          <p><strong>Schedule:</strong> ${escapeHtml(details.schedule)}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants">
            <strong>Participants:</strong>
            <ul class="participants-list"></ul>
          </div>
        `;

        // Add a count badge next to the "Participants:" label
        const strongEl = activityCard.querySelector(".participants strong");
        if (strongEl) {
          const badge = document.createElement("span");
          badge.className = "participant-count";
          badge.textContent = details.participants.length;
          strongEl.appendChild(badge);
        }

        // create and populate participants list using safe DOM methods
        const populatedUl = document.createElement("ul");
        populatedUl.className = "participants-list";

        if (details.participants && details.participants.length > 0) {
          details.participants.forEach((p) => {
            const li = document.createElement("li");
            li.className = "participant-item";

            const avatar = document.createElement("span");
            avatar.className = "avatar";
            avatar.textContent = getInitials(p);

            const nameSpan = document.createElement("span");
            nameSpan.className = "participant-name";
            nameSpan.textContent = p;

            // create delete/unregister button
            const deleteBtn = document.createElement("button");
            deleteBtn.className = "participant-delete";
            deleteBtn.setAttribute("aria-label", `Unregister ${p}`);
            // use a simple cross glyph; it's accessible via aria-label
            deleteBtn.innerHTML = "&times;";

            // add click handler to call DELETE endpoint
            deleteBtn.addEventListener("click", async () => {
              const confirmed = confirm(`Unregister ${p} from ${name}?`);
              if (!confirmed) return;

              try {
                const resp = await fetch(
                  `/activities/${encodeURIComponent(name)}/participants?email=${encodeURIComponent(p)}`,
                  { method: "DELETE" }
                );
                const result = await resp.json();

                if (resp.ok) {
                  messageDiv.textContent = result.message;
                  messageDiv.className = "success";
                  messageDiv.classList.remove("hidden");
                  // refresh the list to reflect removal
                  fetchActivities();
                } else {
                  messageDiv.textContent = result.detail || "Failed to unregister";
                  messageDiv.className = "error";
                  messageDiv.classList.remove("hidden");
                }

                // auto-hide after a few seconds
                setTimeout(() => {
                  messageDiv.classList.add("hidden");
                }, 5000);
              } catch (err) {
                console.error("Error unregistering participant:", err);
                messageDiv.textContent = "Failed to unregister. Please try again.";
                messageDiv.className = "error";
                messageDiv.classList.remove("hidden");
                setTimeout(() => messageDiv.classList.add("hidden"), 5000);
              }
            });

            li.appendChild(avatar);
            li.appendChild(nameSpan);
            li.appendChild(deleteBtn);
            populatedUl.appendChild(li);
          });
        } else {
          const li = document.createElement("li");
          li.className = "no-participants";
          li.textContent = "No participants yet";
          populatedUl.appendChild(li);
        }

        // replace the empty UL from innerHTML with our populated one
        const placeholderUl = activityCard.querySelector(".participants-list");
        if (placeholderUl) placeholderUl.replaceWith(populatedUl);

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();

        // Refresh activities so participants list updates immediately
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
