import { useState } from "react";

export default function Documentation() {
    const [copied, setCopied] = useState(false);

    const curlExample = `curl --location 'http://localhost:8080/api/email/send' \\
--header 'Content-Type: application/json' \\
--header 'X-API-Key: YOUR_API_KEY' \\
--data '[
{
"sender":"hub.mircoservices@gmail.com",
"receivers":["user@gmail.com"],
"cc":[],
"bcc":[],
"subject":"Hello",
"body":"Testing email",
"is_html":false
}
]'`;

    const copyCode = async () => {
        await navigator.clipboard.writeText(curlExample);

        setCopied(true);

        setTimeout(() => {
            setCopied(false);
        }, 2000);
    };

    const features = [
        {
            title: "Multiple Email Credentials",
            desc:
                "Save multiple sender accounts and dynamically select sender emails."
        },

        {
            title: "Background Queue Processing",
            desc:
                "API returns instantly while email jobs execute asynchronously."
        },

        {
            title: "Retry Mechanism",
            desc:
                "Automatically retries failed email jobs up to 3 times."
        },

        {
            title: "Failure Notifications",
            desc:
                "Permanent failures notify sender automatically."
        },

        {
            title: "Unique API Keys",
            desc:
                "Each user receives a unique API key."
        },

        {
            title: "API Key Regeneration",
            desc:
                "API keys can be regenerated anytime from profile section."
        },

        {
            title: "AI Email Suggestions",
            desc:
                "Auto-suggest next lines while typing email body."
        },

        {
            title: "HTML + CC + BCC Support",
            desc:
                "Supports HTML emails, CC, BCC and multiple receivers."
        }
    ];

    return (
        <div className="docs-container card">

            {/* HERO */}

            <div className="docs-header">

                <h1 className="docs-title">
                    Email Service Documentation
                </h1>

                <p className="docs-subtitle">

                    Queue based email infrastructure with API integration support.

                </p>

            </div>


            {/* OVERVIEW */}

            <section className="docs-section">

                <h2 className="docs-heading">
                    Overview
                </h2>

                <p className="docs-text">

                    This platform enables users to send emails using multiple
                    credentials while maintaining fast API response times using
                    background queue processing.

                </p>

            </section>


            {/* FEATURES */}

            <section className="docs-section">

                <h2 className="docs-heading">

                    Features

                </h2>

                <div className="feature-grid">

                    {features.map((feature, idx) => (

                        <div
                            className="feature-card"
                            key={idx}
                        >

                            <h3 className="feature-title">

                                {feature.title}

                            </h3>

                            <p className="feature-description">

                                {feature.desc}

                            </p>

                        </div>

                    ))}

                </div>

            </section>


            {/* FLOW */}

            <section className="docs-section">

                <h2 className="docs-heading">

                    Email Processing Flow

                </h2>

                <div className="flow-box">

                    <div>User Request</div>

                    <div>↓</div>

                    <div>API Receives Request</div>

                    <div>↓</div>

                    <div>Added To Queue</div>

                    <div>↓</div>

                    <div>Worker Sends Email</div>

                    <div>↓</div>

                    <div>Success ✓</div>

                    <div>OR</div>

                    <div>Retry (3 Times)</div>

                    <div>↓</div>

                    <div>Failure Notification</div>

                </div>

            </section>



            {/* API REFERENCE */}

            <section className="docs-section">

                <h2 className="docs-heading">

                    API Reference

                </h2>

                <div className="endpoint-box">

                    POST /api/email/send

                </div>


                <h3 className="docs-subheading">

                    Headers

                </h3>

                <pre className="code-block">

                    Content-Type: application/json

                    X-API-Key: YOUR_API_KEY

                </pre>


                <h3 className="docs-subheading">

                    Request Body

                </h3>

                <pre className="code-block">

                    {`[
{
"sender":"sender@gmail.com",

"receivers":["user@gmail.com"],

"cc":[],

"bcc":[],

"subject":"Hello",

"body":"Message",

"is_html":false
}
]`}

                </pre>


                <h3 className="docs-subheading">

                    cURL Example

                </h3>

                <pre className="code-block">

                    {curlExample}

                </pre>

                <button
                    className="btn-primary"
                    onClick={copyCode}
                >

                    {copied ? "Copied ✓" : "Copy cURL"}

                </button>

            </section>



            {/* NOTES */}

            <section className="docs-section">

                <div className="docs-note">

                    <h3>

                        Important Notes

                    </h3>

                    <ul className="docs-list">

                        <li>

                            API keys are unique per user.

                        </li>

                        <li>

                            API keys can be regenerated from profile section.

                        </li>

                        <li>

                            Queue processing keeps API responses fast.

                        </li>

                        <li>

                            AI suggestions automatically appear while typing.

                        </li>

                        <li>

                            Custom SMTP overrides saved SMTP configuration.

                        </li>

                    </ul>

                </div>

            </section>

        </div>
    );
}