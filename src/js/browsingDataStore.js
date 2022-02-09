let activeTabId = null;
browser.tabs.onActivated.addListener((event) => (activeTabId = event.tabId));
setInterval(browseTime, 1000);

async function browseTime() {
	if (!activeTabId) return;
	let frames = null;
	try {
		frames = await browser.webNavigation.getAllFrames({ tabId: activeTabId });
	} catch (exception) {
		console.log(exception);
	}
	if (!frames) return;
	let mainFrame = frames.filter((frame) => frame.parentFrameId === -1)[0];
	if (!mainFrame.url.startsWith("http")) return;
	let hostname = new URL(mainFrame.url).hostname;
	storeTimeBrowsed(hostname);
}

async function storeTimeBrowsed(hostname) {
	try {
		let time = await browser.storage.local.get({ [hostname]: 0 });
		browser.storage.local.set({ [hostname]: time[hostname] + 1 });
	} catch (exception) {
		console.log(exception);
	}
}
