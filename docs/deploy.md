# Deploy

`.github/workflows/deploy.yml` deploys to any host with SSH and Docker Compose, and is off until the repository variable `DEPLOY_ENABLED` is `true` (ADR 0012).

## Turn it on

1. **Prepare the host.** Install Docker Engine, create a deploy user in the `docker` group, open ports 80 and 443, and point the domain's DNS at the host.
2. **Write the host's `.env`** in the deploy path, from `.env.example`: the public domain as `SITE_ADDRESS`, `LISTEN_ADDRESS=0.0.0.0`, and a strong `POSTGRES_PASSWORD`.
3. **Make a key pair** for the workflow, and add its public half to the deploy user's `~/.ssh/authorized_keys`:

   ```sh
   ssh-keygen -t ed25519 -N '' -C mtg-suite-deploy -f deploy_key   # -N '': no passphrase, the runner cannot type one
   ```

4. **Pin the host key**, read from the host itself:

   ```sh
   ssh-keyscan -p <port> <host>   # prints the host's public keys in known_hosts format
   ```

   Check its fingerprint against the host's console (`ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub` there) before trusting it.

5. **Fill in GitHub**:

   ```sh
   gh secret set DEPLOY_SSH_KEY --env production < deploy_key
   gh secret set DEPLOY_KNOWN_HOSTS --env production    # paste the ssh-keyscan output
   gh variable set DEPLOY_HOST --body <host>
   gh variable set DEPLOY_USER --body <user>
   gh variable set DEPLOY_PATH --body <absolute path on the host>
   gh variable set DEPLOY_PORT --body <port>             # optional, 22 by default
   gh variable set DEPLOY_ENABLED --body true
   ```

   `gh secret set --env production` creates the secret in the `production` environment, so only jobs of that environment can read it. Then delete the local `deploy_key`.

6. **Deploy once by hand** to check it: `gh workflow run deploy.yml --ref main`, then `gh run watch` to follow it.

From then on, every push to `main` that passes CI is deployed. `gh variable set DEPLOY_ENABLED --body false` turns it off again.
