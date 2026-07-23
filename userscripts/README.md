# OMSGuru browser utilities

`omsguru-ticket-panel-tools.user.js` combines the four validated console workflows into a Tampermonkey userscript:

1. Set a reminder and internal note on multiple ticket links.
2. Set internal status **Waiting for Channel Updates** (status ID `4`) with a note.
3. Clear JIRA IDs on multiple ticket links.
4. Re-run dispatch log shipment tracker requests for a client and list of dispatch-log IDs.

## Install and use

1. Install the Tampermonkey browser extension.
2. Open `omsguru-ticket-panel-tools.user.js` from this folder and use Tampermonkey's **Install** action.
3. Sign in to `https://admin.omsguru.com` with an account authorised to perform these changes.
4. On an OMSGuru Admin page, use the **Ticket Tools** button at the lower-right.
5. Paste specific ticket URLs or leave the Ticket URLs field empty to use all ticket links shown on the current page.
6. Confirm the count and action before running it. The tool downloads a CSV audit log on completion.

The userscript operates inside the logged-in Admin session and sends the same form requests as the existing console scripts. It does not bypass permissions.
