export type MatchPair = {
  left: string;
  right: string;
  note?: string;
};

export type KillChainDrill = {
  id: string;
  title: string;
  scenario: string;
  intel: { label: string; value: string }[];
  pairs: MatchPair[];
  sourceNote: string;
};

export const KILL_CHAIN_DRILL: KillChainDrill = {
  id: "kill-chain",
  title: "Map controls to kill-chain activity",
  scenario:
    "SOC telemetry captured the indicators below during an intrusion. Match each observed kill-chain activity to the control the analyst mapped it to, exactly as marked in the source reviewer screenshot.",
  intel: [
    { label: "Malicious executable", value: "invoice.exe" },
    { label: "Malicious IP address", value: "91.161.65.253" },
    { label: "Malware entered organization", value: "1 Dec 2019 14:03:19" },
  ],
  pairs: [
    { left: "Phishing email", right: "Email filtering", note: "Blocks the initial lure before delivery." },
    { left: "Malware download", right: "Firewall file type filter", note: "Stops malicious file types at the boundary." },
    { left: "Malicious website access", right: "VPN", note: "Source mapping: remote-access path control." },
    { left: "Malware install", right: "Updated antivirus", note: "Endpoint control against installation." },
    { left: "Active link", right: "DNS sinkhole", note: "Neutralizes callback to the malicious domain." },
    { left: "Malware execution", right: "Network segmentation", note: "Limits lateral movement on execution." },
  ],
  sourceNote:
    "Simulated interactive drill transcribed from the CYSA Reviewer 2026 kill-chain screenshot. Pairings are exactly as marked in the source.",
};

export type DrillField =
  | { kind: "text"; label: string; answer: string; placeholder?: string }
  | { kind: "number"; label: string; answer: number; placeholder?: string }
  | { kind: "single"; label: string; options: string[]; answer: string }
  | { kind: "multi"; label: string; options: string[]; answers: string[] };

export type FieldDrillData = {
  id: string;
  title: string;
  scenario: string;
  exhibit?: { src: string; caption: string };
  fields: DrillField[];
  explanation: string;
  sourceNote: string;
};

export const NETSTAT_DRILL: FieldDrillData = {
  id: "netstat-concern",
  title: "Netstat triage: hostile IP, IoC, response",
  scenario:
    "The exhibit shows active connections plus the analyst's marked conclusions. Enter the most concerning source IP, identify the indicator of compromise, and select every correct corrective action.",
  exhibit: { src: "/bank-images/r2026-netstat-concern.jpg", caption: "Connection table and the analyst's marked conclusions." },
  fields: [
    { kind: "text", label: "Source IP the analyst should be most concerned about", answer: "41.21.18.102", placeholder: "e.g. 10.0.0.5" },
    {
      kind: "single",
      label: "Indicator of compromise",
      options: ["Modified index.html file", "New local administrator account", "Unknown scheduled task", "Antivirus service disabled"],
      answer: "Modified index.html file",
    },
    {
      kind: "multi",
      label: "Corrective actions (select all that apply)",
      options: [
        "Change the password on the qjames account.",
        "Block external sftp access.",
        "Delete the qjames account.",
        "Deny 192.168.*.* at firewall.",
        "Shut down the insecure file transfer server.",
        "Encrypt index.html.",
      ],
      answers: ["Change the password on the qjames account.", "Block external sftp access."],
    },
  ],
  explanation:
    "The marked IP of concern is 41.21.18.102, the indicator of compromise is the modified index.html file, and the two marked corrective actions are rotating the qjames account password and blocking external SFTP access — deleting the account, firewalling all of 192.168, killing the transfer server, or merely encrypting the file were not marked.",
  sourceNote:
    "Simulated drill transcribed from the CYSA Reviewer 2026 netstat screenshot. IP, IoC, and corrective actions are exactly as marked in the source; IoC dropdown distractors are practice scaffolding.",
};

export const PHISHING_DRILL: FieldDrillData = {
  id: "phishing-outbreak",
  title: "Phishing outbreak: patient zero and blast radius",
  scenario:
    "The exhibit shows the post-phishing network diagram with the analyst's filled-in answers. Reproduce the three findings: the malware executable, the infected workstation count, and the click count.",
  exhibit: { src: "/bank-images/r2026-phishing-diagram.jpg", caption: "Network diagram drill with the analyst's answers filled in." },
  fields: [
    { kind: "text", label: "Malware executable name", answer: "mailclient.exe", placeholder: "e.g. invoice.exe" },
    { kind: "number", label: "Workstations infected", answer: 4, placeholder: "number" },
    { kind: "number", label: "Users who clicked the link in the phishing email", answer: 7, placeholder: "number" },
  ],
  explanation:
    "The marked answers are the mailclient.exe executable, 4 infected workstations, and 7 users who clicked the phishing link.",
  sourceNote:
    "Simulated drill transcribed from the CYSA Reviewer 2026 phishing-diagram screenshot. All three answers are exactly as marked in the source.",
};

export const DDOS_DRILL: FieldDrillData = {
  id: "ddos-target",
  title: "DDoS target: compromised host and containment",
  scenario:
    "The exhibit shows a cloud architecture under DDoS against 52.13.66.104 with the analyst's selections. Identify the compromised host and executable, then choose the containment remediation.",
  exhibit: { src: "/bank-images/r2026-ddos-diagram.jpg", caption: "Cloud diagram with DDoS target and the analyst's selections." },
  fields: [
    { kind: "text", label: "Compromised host", answer: "192.168.10.4", placeholder: "e.g. 192.168.1.10" },
    { kind: "text", label: "Compromised executable", answer: "modfila.exe", placeholder: "e.g. malware.exe" },
    {
      kind: "single",
      label: "Correct remediation",
      options: [
        "Block all HTTP requests to the target IP address.",
        "Take the entire cloud region offline",
        "Reinstall every workload in the diagram",
        "Ignore the attack until it stops on its own",
      ],
      answer: "Block all HTTP requests to the target IP address.",
    },
  ],
  explanation:
    "The marked answers are host 192.168.10.4, the modfila.exe executable, and blocking all HTTP requests to the target IP. The alternative remediations are deliberately weak practice distractors.",
  sourceNote:
    "Simulated drill transcribed from the CYSA Reviewer 2026 DDoS screenshot. Host, executable, and remediation are exactly as marked in the source; distractor remediations are practice scaffolding.",
};

export const CMD_DRILL: FieldDrillData = {
  id: "cmd-forensics",
  title: "Command forensics: which command, which exfiltrator",
  scenario:
    "The exhibit shows two output tabs plus the analyst's selections. Name the command behind each tab and identify the file that performed the exfiltration.",
  exhibit: { src: "/bank-images/r2026-netstat-cmd.jpg", caption: "Output tabs and the analyst's marked answers." },
  fields: [
    {
      kind: "single",
      label: "Command that generated the output in tab 1 (connection table)",
      options: ["netstat -ano", "tasklist", "ipconfig /all", "nslookup"],
      answer: "netstat -ano",
    },
    {
      kind: "single",
      label: "Command that generated the output in tab 2 (process list)",
      options: ["tasklist", "netstat -ano", "tracert", "ping"],
      answer: "tasklist",
    },
    {
      kind: "single",
      label: "File that performed the exfiltration",
      options: ["cmd.exe", "svchost.exe", "sftp.exe", "notepad.exe", "users.txt", "calendar.dat", "explorer.exe", "calc.exe"],
      answer: "sftp.exe",
    },
  ],
  explanation:
    "Tab 1's connection table comes from netstat -ano, tab 2's process list from tasklist, and the marked exfiltrating file is sftp.exe.",
  sourceNote:
    "Simulated drill transcribed from the CYSA Reviewer 2026 command-forensics screenshot. All three answers are exactly as marked in the source; dropdown distractors are standard-command practice scaffolding.",
};

export type PatchDrill = {
  id: string;
  title: string;
  scenario: string;
  findings: { title: string; description: string; asset: string; risk: string; reference: string }[];
  servers: string[];
  correctServer: string;
  mitigations: string[];
  correctMitigation: string;
  explanation: string;
  sourceNote: string;
};

export const PATCH_DRILL: PatchDrill = {
  id: "patch-priority",
  title: "Patch prioritization under a 14-day SLA",
  scenario:
    "A vulnerability scan returned the findings below. Select the server that must be patched within 14 calendar days, then select the appropriate technique and mitigation — exactly as marked in the source reviewer screenshot.",
  findings: [
    {
      title: "Microsoft IIS: Unsupported software version detected",
      description: "The software version detected is no longer supported.",
      asset: "192.168.76.5",
      risk: "Unpatched software",
      reference: "CVE-2022-0155, CVSS 9.2",
    },
    {
      title: 'Sensitive cookie in HTTPS session without "secure" attribute',
      description:
        "The secure attribute for sensitive cookies in HTTPS sessions is not set, which could cause the user agent to send those cookies in plaintext over an HTTP session.",
      asset: "192.168.76.6",
      risk: "Session sidejacking",
      reference: "CVE-2021-0462, CVSS 7.4",
    },
    {
      title: "Untrusted SSL/TLS Server X.509 certificate",
      description:
        "The server's SSL/TLS certificate is signed by a certificate authority that is untrusted or unknown.",
      asset: "192.168.60.5",
      risk: "Untrusted certificate",
      reference: "As shown in the source scan output",
    },
  ],
  servers: ["192.168.50.6", "192.168.76.6", "192.168.60.5", "192.168.60.6", "192.168.50.5", "192.168.76.5"],
  correctServer: "192.168.60.5",
  mitigations: [
    "Patch, upload signed certificate from trusted third-party provider",
    "Reboot the server and rescan next quarter",
    "Disable host antivirus during business hours",
    "Take no action and accept the risk permanently",
  ],
  correctMitigation: "Patch, upload signed certificate from trusted third-party provider",
  explanation:
    "The marked answer patches 192.168.60.5 (untrusted certificate) within the 14-day window by replacing the certificate with one from a trusted third party. The three alternative mitigations are deliberately weak practice distractors written for this drill — only the server choice and the correct mitigation come from the source screenshot.",
  sourceNote:
    "Simulated interactive drill transcribed from the CYSA Reviewer 2026 patch-prioritization screenshot. Server choice and correct mitigation are exactly as marked in the source; distractor mitigations are practice scaffolding.",
};
