document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('import-file-input');

    fileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) {
            return; // No file selected
        }

        const reader = new FileReader();

        reader.onload = async (e) => {
            let session;
            try {
                session = JSON.parse(e.target.result);
            } catch (error) {
                alert('Invalid JSON file. Please select a valid session file.');
                return;
            }

            // Basic validation
            if (!session || typeof session !== 'object' || !Array.isArray(session.tabs)) {
                alert('The selected file does not appear to be a valid session file.');
                return;
            }

            try {
                await browser.runtime.sendMessage({action: "import", session});
                // Close the import tab after successful import
                const currentTab = await browser.tabs.getCurrent();
                await browser.tabs.remove(currentTab.id);
            } catch (error) {
                alert(`Failed to import session: ${error.message}`);
            }
        };

        reader.onerror = (error) => {
            alert(`Failed to read file: ${error.message}`);
        };

        reader.readAsText(file);
    });
});