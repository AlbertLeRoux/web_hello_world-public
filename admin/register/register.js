const registrationForm =
    document.getElementById('registrationForm');

const usernameInput =
    document.getElementById('username');

const phraseInput =
    document.getElementById('phrase');

const registerButton =
    document.getElementById('registerButton');

const registrationStatus =
    document.getElementById('registrationStatus');


function showStatus(message, type = '') {
    registrationStatus.textContent = message;

    registrationStatus.className =
        'registration-status';

    if (type) {
        registrationStatus.classList.add(
            `is-${type}`
        );
    }
}


async function readJsonResponse(response) {
    const contentType =
        response.headers.get('content-type') || '';

    if (
        !contentType.includes(
            'application/json'
        )
    ) {
        throw new Error(
            `Unexpected server response: ${response.status}`
        );
    }

    return response.json();
}


registrationForm.addEventListener(
    'submit',
    async (event) => {
        event.preventDefault();

        const username =
            usernameInput.value.trim();

        const phrase =
            phraseInput.value;

        if (!username || !phrase) {
            showStatus(
                'Username and enrollment phrase are required.',
                'error'
            );

            return;
        }

        registerButton.disabled = true;

        showStatus(
            'Requesting passkey registration options...'
        );

        try {
            if (
                !window.PublicKeyCredential ||
                !window.SimpleWebAuthnBrowser
            ) {
                throw new Error(
                    'WebAuthn is not available in this browser.'
                );
            }

            const optionsResponse =
                await fetch(
                    '/api/admin/webauthn/enrollment',
                    {
                        method: 'POST',

                        headers: {
                            'Content-Type':
                                'application/json'
                        },

                        body: JSON.stringify({
                            username,
                            phrase
                        })
                    }
                );

            const options =
                await readJsonResponse(
                    optionsResponse
                );

            if (!optionsResponse.ok) {
                throw new Error(
                    options.status === 'rejected'
                        ? 'Enrollment was rejected.'
                        : 'Unable to begin passkey registration.'
                );
            }

            /*
             * The phrase is no longer needed after the server
             * has generated and stored the WebAuthn challenge.
             */
            phraseInput.value = '';

            showStatus(
                'Follow the browser prompt to create the passkey...'
            );

            const {
                startRegistration
            } = window.SimpleWebAuthnBrowser;

            const registrationResponse =
                await startRegistration({
                    optionsJSON: options
                });

            showStatus(
                'Verifying the new passkey...'
            );

            const verificationResponse =
                await fetch(
                    '/api/admin/webauthn/registration/verify',
                    {
                        method: 'POST',

                        headers: {
                            'Content-Type':
                                'application/json'
                        },

                        body: JSON.stringify({
                            username,
                            response:
                                registrationResponse
                        })
                    }
                );

            const verification =
                await readJsonResponse(
                    verificationResponse
                );

            if (
                !verificationResponse.ok ||
                !verification.verified
            ) {
                throw new Error(
                    verification.error ||
                    'Passkey registration could not be verified.'
                );
            }

            showStatus(
                'Passkey registration completed successfully.',
                'success'
            );

            registrationForm.reset();

        } catch (err) {
            console.error(
                'Passkey registration error:',
                err
            );

            let message =
                'Passkey registration failed.';

            if (
                err &&
                typeof err.message === 'string' &&
                err.message
            ) {
                message = err.message;
            }

            showStatus(
                message,
                'error'
            );

        } finally {
            registerButton.disabled = false;
        }
    }
);
