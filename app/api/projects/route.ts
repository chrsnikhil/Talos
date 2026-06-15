import { NextResponse } from 'next/server';

export async function GET() {
  const token = process.env.GITHUB_API;

  if (!token) {
    return NextResponse.json({ error: 'GITHUB_API token not found' }, { status: 500 });
  }

  try {
    const query = `
      query {
        viewer {
          pinnedItems(first: 6, types: REPOSITORY) {
            nodes {
              ... on Repository {
                id
                name
                description
                url
                homepageUrl
                pushedAt
                createdAt
                forkCount
                stargazers {
                  totalCount
                }
                primaryLanguage {
                  name
                  color
                }
                licenseInfo {
                  spdxId
                }
                repositoryTopics(first: 6) {
                  nodes {
                    topic {
                      name
                    }
                  }
                }
              }
            }
          }
        }
      }
    `;

    const res = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: {
        Authorization: `bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
      next: { revalidate: 0 }
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error("GitHub GraphQL Error:", errorText);
      return NextResponse.json({ error: `GitHub API error: ${res.status}` }, { status: res.status });
    }

    const json = await res.json();

    if (json.errors) {
      console.error("GraphQL Errors:", json.errors);
      return NextResponse.json({ error: json.errors[0].message }, { status: 500 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pinnedRepos = json.data.viewer.pinnedItems.nodes.map((repo: any) => ({
      id: repo.id,
      name: repo.name,
      description: repo.description,
      html_url: repo.url,
      homepage_url: repo.homepageUrl,
      pushed_at: repo.pushedAt,
      created_at: repo.createdAt,
      forks_count: repo.forkCount,
      language: repo.primaryLanguage?.name || null,
      language_color: repo.primaryLanguage?.color || '#000000',
      stargazers_count: repo.stargazers.totalCount,
      license: repo.licenseInfo?.spdxId || null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      topics: repo.repositoryTopics.nodes.map((node: any) => node.topic.name),
    }));

    return NextResponse.json(pinnedRepos);
  } catch (error) {
    console.error("Fetch Error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
