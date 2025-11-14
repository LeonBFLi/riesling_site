document.addEventListener("DOMContentLoaded", () => {
  const videos = Array.isArray(window.initialVideos) ? window.initialVideos : [];
  const select = document.getElementById("video-select");
  const player = document.getElementById("video-player");
  const feedback = document.getElementById("guestbook-feedback");
  const form = document.getElementById("guestbook-form");
  const timelineMarkers = Array.from(document.querySelectorAll(".timeline__marker"));
  const timelineEntries = new Map(
    Array.from(document.querySelectorAll(".timeline__entry")).map((entry) => [entry.id.replace("timeline-entry-", ""), entry])
  );

  const setFeedback = (message, isError = false) => {
    if (!feedback) return;
    feedback.textContent = message;
    feedback.classList.remove("feedback--success", "feedback--error");
    feedback.classList.add(isError ? "feedback--error" : "feedback--success");
  };

  const clearFeedback = () => {
    if (!feedback) return;
    feedback.textContent = "";
    feedback.classList.remove("feedback--success", "feedback--error");
  };

  const setVideoSource = (fileName) => {
    if (!player || !fileName) return;
    const source = player.querySelector("source");
    if (!source) return;
    const encoded = encodeURIComponent(fileName);
    source.src = `/videos/${encoded}`;
    player.load();
  };

  if (select && videos.length > 0) {
    setVideoSource(select.value || videos[0]);
    select.addEventListener("change", (event) => {
      setVideoSource(event.target.value);
      clearFeedback();
    });
  }

  if (form) {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      clearFeedback();
      const submitButton = form.querySelector("button[type='submit']");
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = "发送中...";
      }

      try {
        const formData = new FormData(form);
        const response = await fetch("/guestbook", {
          method: "POST",
          body: new URLSearchParams(formData),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          throw new Error(errorData?.message || "提交失败，请稍后再试。");
        }

        form.reset();
        setFeedback("留言成功！感谢你的分享。", false);
      } catch (error) {
        setFeedback(error.message || "提交失败，请稍后再试。", true);
      } finally {
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.textContent = "送出温暖";
        }
      }
    });
  }

  const activateTimelineEntry = (entryId) => {
    if (!entryId || !timelineEntries.has(entryId)) {
      return;
    }

    timelineMarkers.forEach((marker) => {
      if (marker.dataset.entry === entryId) {
        marker.classList.add("timeline__marker--active");
        marker.setAttribute("aria-pressed", "true");
      } else {
        marker.classList.remove("timeline__marker--active");
        marker.setAttribute("aria-pressed", "false");
      }
    });

    timelineEntries.forEach((entry, id) => {
      const isActive = id === entryId;
      entry.classList.toggle("timeline__entry--active", isActive);
      entry.setAttribute("aria-hidden", String(!isActive));
    });
  };

  if (timelineMarkers.length > 0 && timelineEntries.size > 0) {
    timelineMarkers.forEach((marker) => {
      marker.addEventListener("click", () => {
        activateTimelineEntry(marker.dataset.entry);
      });
    });

    const initiallyActive = timelineMarkers.find((marker) => marker.classList.contains("timeline__marker--active"));
    if (initiallyActive) {
      activateTimelineEntry(initiallyActive.dataset.entry);
    }
  }
});
