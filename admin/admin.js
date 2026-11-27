const authenticationForm =
    document.getElementById('authenticationForm');

const usernameInput =
    document.getElementById('username');

const signInButton =
    document.getElementById('signInButton');

const authenticationStatus =
    document.getElementById('authenticationStatus');

const authenticatedContent =
    document.getElementById('authenticatedContent');

const authenticatedName =
    document.getElementById('authenticatedName');


function showStatus(message, type = '') {
    authenticationStatus.textContent = message;

    authenticationStatus.className =
        'authentication-status';

    if (type) {
        authenticationStatus.classList.add(
            `is-${type}`
        );
    }
}

function showAuthenticatedState(session) {
    authenticatedName.textContent =
        session.display_name;

    authenticatedContent.hidden = false;
    authenticationForm.hidden = true;

    showStatus(
        'Authenticated session active.',
        'success'
    );
}


function showSignedOutState() {
    authenticatedContent.hidden = true;
    authenticationForm.hidden = false;

    authenticatedName.textContent = '';
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

async function checkExistingSession() {
    try {
        const response =
            await fetch(
                '/api/admin/session',
                {
                    method: 'GET',
                    credentials: 'same-origin'
                }
            );

        if (response.status === 401) {
            showSignedOutState();
            return;
        }

        const session =
            await readJsonResponse(
                response
            );

        if (
            response.ok &&
            session.authenticated
        ) {
            showAuthenticatedState(
                session
            );

            return;
        }

        showSignedOutState();

    } catch (err) {
        console.error(
            'Admin session check error:',
            err
        );

        showSignedOutState();

        showStatus(
            'Unable to check the current session.',
            'error'
        );
    }
}

authenticationForm.addEventListener(
    'submit',
    async (event) => {
        event.preventDefault();

        const username =
            usernameInput.value.trim();

        if (!username) {
            showStatus(
                'Username is required.',
                'error'
            );

            return;
        }

        signInButton.disabled = true;
        authenticatedContent.hidden = true;

        showStatus(
            'Requesting authentication challenge...'
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
                    '/api/admin/webauthn/authentication/options',
                    {
                        method: 'POST',

                        headers: {
                            'Content-Type':
                                'application/json'
                        },

                        body: JSON.stringify({
                            username
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
                        ? 'Authentication was rejected.'
                        : 'Unable to begin authentication.'
                );
            }

            showStatus(
                'Follow the browser prompt to authenticate...'
            );

            const {
                startAuthentication
            } = window.SimpleWebAuthnBrowser;

            const authenticationResponse =
                await startAuthentication({
                    optionsJSON: options
                });

            showStatus(
                'Verifying passkey...'
            );

            const verificationResponse =
                await fetch(
                    '/api/admin/webauthn/authentication/verify',
                    {
                        method: 'POST',

                        headers: {
                            'Content-Type':
                                'application/json'
                        },

                        body: JSON.stringify({
                            username,
                            response:
                                authenticationResponse
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
                    'Passkey authentication failed.'
                );
            }

            showAuthenticatedState(
                verification
            );
            showStatus(
                'Passkey authentication successful.',
                'success'
            );

        } catch (err) {
            console.error(
                'Passkey authentication error:',
                err
            );

            let message =
                'Passkey authentication failed.';

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
            signInButton.disabled = false;
        }
    }
);
checkExistingSession();
