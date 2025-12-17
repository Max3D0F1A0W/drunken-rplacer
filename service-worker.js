let attachedTabId = undefined;

chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
	if (attachedTabId === undefined) {
		for (const tab of await chrome.tabs.query({url: "https://rplace.live/*"})) {
			if (typeof tab.id === "number") {
				try {
					await chrome.debugger.attach({tabId: tab.id}, "1.3");

					attachedTabId = tab.id;
				} catch {
					;
				}

				break;
			}
		}

		if (attachedTabId === undefined) {
			return;
		}
	}

	const actions = message.split("-");

	switch (actions[0]) {
		case "move":
			chrome.debugger.sendCommand({tabId: attachedTabId}, "Input.dispatchKeyEvent", {
				type: "keyDown",
				code: "Arrow" + actions[1][0].toUpperCase() + actions[1].slice(1),
				key: "Arrow" + actions[1][0].toUpperCase() + actions[1].slice(1)
			});

			break;
		case "push":
			chrome.debugger.sendCommand({tabId: attachedTabId}, "Input.dispatchKeyEvent", {
				type: "keyDown",
				code: actions[1].length < 2 ? actions[1] : actions[1][0].toUpperCase() + actions[1].slice(1),
				key: actions[1].length < 2 ? actions[1] : actions[1][0].toUpperCase() + actions[1].slice(1)
			});

			break;
		case "restart":
			chrome.tabs.reload(attachedTabId/*, {bypassCache: true}*/);
	}
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
	if (attachedTabId !== undefined && tabId === attachedTabId && changeInfo.url?.startsWith("https://rplace.live") === false) {
		await chrome.debugger.detach({tabId: attachedTabId});

		attachedTabId = undefined;
	}
});

chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
	if (tabId == attachedTabId)
		attachedTabId = undefined;
});

chrome.debugger.onDetach.addListener((source, reason) => {
	// to-do: find out, why exactly does it detach randomly

	attachedTabId = undefined;
});