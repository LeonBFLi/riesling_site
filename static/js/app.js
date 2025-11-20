document.addEventListener("DOMContentLoaded", () => {
  const feedback = document.getElementById("guestbook-feedback");
  const form = document.getElementById("guestbook-form");
  const messageField = document.getElementById("message");
  const attachmentInput = document.getElementById("attachment");
  const attachmentStatus = document.getElementById("attachment-status");
  const timelineMarkers = Array.from(document.querySelectorAll(".timeline__marker"));
  const timelineEntries = new Map(
    Array.from(document.querySelectorAll(".timeline__entry")).map((entry) => [entry.id.replace("timeline-entry-", ""), entry])
  );
  const toolSecretContainer = document.getElementById("tool-share-secret");
  const toolRevealButton = document.querySelector("[data-tool-reveal]");

  const passGate = document.getElementById("pass-gate");
  const passGateForm = document.getElementById("pass-gate-form");
  const passGateInput = document.getElementById("pass-gate-input");
  const passGateFeedback = document.getElementById("pass-gate-feedback");
  const PASS_GATE_KEY = "pass-gate-unlocked";
  const allowedPasscodes = ["riesling"];

  const setPassGateMessage = (message, isError = false) => {
    if (!passGateFeedback) return;
    passGateFeedback.textContent = message;
    passGateFeedback.classList.toggle("pass-gate__feedback--error", isError);
  };

  const togglePassGate = (shouldLock) => {
    if (!passGate) return;
    passGate.classList.toggle("pass-gate--hidden", !shouldLock);
    passGate.setAttribute("aria-hidden", shouldLock ? "false" : "true");
    document.body.classList.toggle("is-locked", shouldLock);
    if (shouldLock && passGateInput instanceof HTMLElement) {
      passGateInput.focus();
      if (typeof passGateInput.setSelectionRange === "function") {
        passGateInput.setSelectionRange(0, passGateInput.value.length);
      }
    }
  };

  const validatePasscode = (value) => allowedPasscodes.includes(value.trim().toLowerCase());

  const unlockPassGate = () => {
    sessionStorage.setItem(PASS_GATE_KEY, "1");
    togglePassGate(false);
    setPassGateMessage("");
  };

  if (passGate) {
    const unlocked = sessionStorage.getItem(PASS_GATE_KEY) === "1";
    togglePassGate(!unlocked);
  } else {
    document.body.classList.remove("is-locked");
  }

  if (passGateForm && passGateInput) {
    passGateForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const value = passGateInput.value || "";
      if (!value.trim()) {
        setPassGateMessage("需要先输入口令。", true);
        return;
      }
      if (!validatePasscode(value)) {
        setPassGateMessage("口令和提示不太匹配，再试一次。", true);
        return;
      }
      unlockPassGate();
    });
  }

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

  const updateAttachmentStatus = () => {
    if (!attachmentStatus || !attachmentInput) return;
    const file = attachmentInput.files?.[0];
    if (file) {
      attachmentStatus.textContent = `已附上一张图片：${file.name}`;
      attachmentStatus.classList.add("hint--active");
    } else {
      attachmentStatus.textContent = attachmentStatus.dataset.defaultText || "";
      attachmentStatus.classList.remove("hint--active");
    }
  };

  const attachImageFile = (file) => {
    if (!attachmentInput || !file) return;
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    attachmentInput.files = dataTransfer.files;
    updateAttachmentStatus();
  };

  if (attachmentInput) {
    attachmentInput.addEventListener("change", updateAttachmentStatus);
  }

  if (messageField) {
    messageField.addEventListener("paste", (event) => {
      const clipboardFiles = Array.from(event.clipboardData?.files || []).filter((file) =>
        file.type.startsWith("image/")
      );

      if (clipboardFiles.length === 0) {
        return;
      }

      attachImageFile(clipboardFiles[0]);
      setFeedback("已捕捉到这张图片，一并寄出了。", false);
    });
  }

  if (form) {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      clearFeedback();
      const submitButton = form.querySelector("button[type='submit']");
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = "正在寄出...";
      }

      try {
        const formData = new FormData(form);
        const response = await fetch("/guestbook", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          throw new Error(errorData?.message || "提交失败，请稍后再试。");
        }

        form.reset();
        setFeedback("谢谢你把这段心声告诉我。", false);
        if (attachmentInput) {
          attachmentInput.value = "";
          updateAttachmentStatus();
        }
      } catch (error) {
        setFeedback(error.message || "提交失败，请稍后再试。", true);
      } finally {
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.textContent = "轻轻寄出";
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

  const escapeHtml = (value) =>
    value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  const updateToolSecret = (message, isError = false) => {
    if (!toolSecretContainer) return;
    toolSecretContainer.classList.toggle("tool-share__secret--error", isError);
    toolSecretContainer.textContent = message;
  };

  const fetchToolSecret = async (answer) => {
    const response = await fetch("/tool-secret", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answer }),
    });

    const data = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(data?.message || "传送门暂时未开启。");
    }

    return typeof data?.content === "string" ? data.content : "";
  };

  if (toolRevealButton && toolSecretContainer) {
    toolRevealButton.addEventListener("click", async () => {
      const reply = window.prompt("和背景元素匹配那首歌是？（化*孤***）");
      if (reply === null) return;

      const answer = reply.trim();
      if (!answer) {
        updateToolSecret("需要先回答歌名，鲸鱼才能带路。", true);
        return;
      }

      updateToolSecret("正在穿梭传送门...", false);

      try {
        const secretContent = await fetchToolSecret(answer);
        const escapedContent = escapeHtml(secretContent).replace(/\n/g, "<br>");
        toolSecretContainer.classList.remove("tool-share__secret--error");
        toolSecretContainer.innerHTML = `<div class="tool-share__content">${escapedContent}</div>`;
      } catch (error) {
        updateToolSecret(error.message || "传送门暂时未开启。", true);
      }
    });
  }

  const letterDialog = document.getElementById("letter-dialog");
  const letterOpenTrigger = document.querySelector("[data-letter-open]");
  const letterCloseTriggers = Array.from(document.querySelectorAll("[data-letter-close]"));
  let previouslyFocusedElement = null;

  const setLetterDialogState = (shouldOpen) => {
    if (!letterDialog) return;

    if (shouldOpen) {
      previouslyFocusedElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      letterDialog.classList.add("letter-dialog--open");
      letterDialog.removeAttribute("aria-hidden");
      const panel = letterDialog.querySelector(".letter-dialog__panel");
      if (panel instanceof HTMLElement) {
        panel.focus();
      }
    } else {
      letterDialog.classList.remove("letter-dialog--open");
      letterDialog.setAttribute("aria-hidden", "true");
      if (previouslyFocusedElement) {
        previouslyFocusedElement.focus();
      }
    }
  };

  if (letterDialog && letterOpenTrigger) {
    letterOpenTrigger.addEventListener("click", () => setLetterDialogState(true));
    letterCloseTriggers.forEach((trigger) => {
      trigger.addEventListener("click", () => setLetterDialogState(false));
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && letterDialog.classList.contains("letter-dialog--open")) {
        setLetterDialogState(false);
      }
    });
  }

  const orientationTip = document.getElementById("orientation-tip");
  if (orientationTip) {
    const dismissButton = orientationTip.querySelector("[data-orientation-dismiss]");
    const mobileQuery = window.matchMedia("(max-width: 768px)");
    const portraitQuery = window.matchMedia("(orientation: portrait)");
    let dismissed = false;

    const updateOrientationTip = () => {
      const shouldShow = !dismissed && mobileQuery.matches && portraitQuery.matches;
      orientationTip.classList.toggle("orientation-tip--visible", shouldShow);
      orientationTip.setAttribute("aria-hidden", shouldShow ? "false" : "true");
    };

    const bindQueryListener = (query) => {
      if (!query) return;
      const handler = () => updateOrientationTip();
      if (typeof query.addEventListener === "function") {
        query.addEventListener("change", handler);
      } else if (typeof query.addListener === "function") {
        query.addListener(handler);
      }
    };

    updateOrientationTip();
    bindQueryListener(mobileQuery);
    bindQueryListener(portraitQuery);

    if (dismissButton) {
      dismissButton.addEventListener("click", () => {
        dismissed = true;
        updateOrientationTip();
      });
    }
  }

});
