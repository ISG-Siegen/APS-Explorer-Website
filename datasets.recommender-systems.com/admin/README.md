# APS Explorer Admin deployment

The complete `admin/` directory is protected with Apache HTTP Basic Authentication.
The configured username is `admin`; the password hash must not be committed to Git.

> HTTP Basic credentials must only be used over HTTPS. Enable and verify TLS for the production
> domain before entering the admin credentials; otherwise username and password can be intercepted.

## 1. Create the password file

Keep the password file outside the public document root. In this repository the intended
location is `configs/admin.htpasswd`, because `configs/` is a sibling of the deployed web app.

On local XAMPP, run this command and enter a new, unique password when prompted:

```powershell
C:\xampp\apache\bin\htpasswd.exe -c C:\xampp\htdocs\APS-Explorer-Website\configs\admin.htpasswd admin
```

To change the password later, run the same command without `-c`:

```powershell
C:\xampp\apache\bin\htpasswd.exe C:\xampp\htdocs\APS-Explorer-Website\configs\admin.htpasswd admin
```

The command prompts twice for the new password and writes only its hash to the password file.
Use `-c` only when creating a new password file because it replaces an existing file.

On the production server, use the hosting control panel's directory-protection feature or run:

```sh
htpasswd -c /absolute/server/path/to/configs/admin.htpasswd admin
```

To change an existing production password, omit `-c`:

```sh
htpasswd /absolute/server/path/to/configs/admin.htpasswd admin
```

Do not reuse a personal password. The generated `configs/admin.htpasswd` file is ignored by Git.

## 2. Configure the absolute production path

Edit the `AuthUserFile` line in `admin/.htaccess` after uploading:

```apache
AuthUserFile "/www/htdocs/w0216ee9/configs/admin.htpasswd"
```

Apache resolves relative paths against `ServerRoot`, so this must be an absolute filesystem path.
The admin area intentionally fails closed with an HTTP 500 response if the path is invalid.

## 3. Verify protection

1. Open `/admin/` in a private browser window.
2. Confirm that the browser asks for a username and password before loading any HTML.
3. Sign in as `admin`.
4. Open `/admin/api.php?action=summary` in another private window and confirm it also asks for credentials.
5. Verify that the public `index.php?action=log&task=getUsageLogs` no longer returns logs.

The server must allow authentication directives in `.htaccess` (`AllowOverride AuthConfig` or
`AllowOverride All`) and have `mod_auth_basic`, `mod_authn_file`, and `mod_authz_user` enabled.
