// Dynamic rules for blocking domains
let isEmergencyMode = false;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'NEXUS_ENABLE_BLOCKER') {
    isEmergencyMode = true;
    const domains = message.domains || [];
    
    const rules = domains.map((domain, index) => ({
      id: index + 1,
      priority: 1,
      action: { type: "block" },
      condition: {
        urlFilter: `||${domain}`,
        resourceTypes: ["main_frame", "sub_frame"]
      }
    }));

    chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: rules.map(r => r.id),
      addRules: rules
    }, () => {
      console.log("NEXUS: Emergency blocking rules applied.");
    });
  } else if (message.type === 'NEXUS_DISABLE_BLOCKER') {
    isEmergencyMode = false;
    chrome.declarativeNetRequest.getDynamicRules(previousRules => {
      const previousRuleIds = previousRules.map(rule => rule.id);
      chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: previousRuleIds
      }, () => {
        console.log("NEXUS: Emergency blocking rules removed.");
      });
    });
  }
});
