chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
	if (sender?.tab?.url?.includes("https://rplace.live") && typeof sender.tab.id === "number") {
		for (const targetInfo of await chrome.debugger.getTargets()) {
			if (targetInfo.type === "page" && targetInfo.tabId === sender.tab.id && !targetInfo.attached) {
				try {
					await chrome.debugger.attach({tabId: sender.tab.id}, "1.3");
				} catch {
					;
				}

				break;
			}
		}
	} else {
		return;
	}

	try {
		const actions = message.split("-");

		switch (actions[0]) {
			case "move":
				chrome.debugger.sendCommand({tabId: sender.tab.id}, "Input.dispatchKeyEvent", {
					type: "keyDown",
					code: "Arrow" + actions[1][0].toUpperCase() + actions[1].slice(1),
					key: "Arrow" + actions[1][0].toUpperCase() + actions[1].slice(1)
				});

				break;
			case "push":
				chrome.debugger.sendCommand({tabId: sender.tab.id}, "Input.dispatchKeyEvent", {
					type: "keyDown",
					code: actions[1].length < 2 ? actions[1] : actions[1][0].toUpperCase() + actions[1].slice(1),
					key: actions[1].length < 2 ? actions[1] : actions[1][0].toUpperCase() + actions[1].slice(1)
				});

				break;
			case "restart":
				chrome.tabs.reload(sender.tab.id/*, {bypassCache: true}*/);
		}
	} catch (error) {
		sendResponse(error);

		throw error;
	}
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
	for (const targetInfo of await chrome.debugger.getTargets()) {
		if (targetInfo.type === "page" && targetInfo.tabId === tabId && targetInfo.attached && changeInfo.url?.startsWith("https://rplace.live") === false) {
			await chrome.debugger.detach({tabId});

			break;
		}
	}
});