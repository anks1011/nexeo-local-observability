const str = `["organization","a0000000-0000-0000-0000-000000000010","organization_setting","password_login_policy","{"login_methods":{"otp_enabled":0,"google_login_enabled":0,"email_password_enabled":1},"account_protection":{"lockout_duration_minutes":30,"max_failed_login_attempts_count":2,"auto_deactivate_after_inactivity_days":90},"password_lifecycle":{"password_history_count":5,"password_expiry_period_days":90,"password_reset_link_validity_hours":24},"password_complexity":{"minimum_length":14,"required_character_classes":["uppercase_letter","lowercase_letter","number"]},"multi_factor_authentication":{"enable_mfa_flag":0,"enforce_for_institution_users_flag":0,"allowed_mfa_modes":"email"}}","00000000-0000-0000-0000-000000000001","00000000-0000-0000-0000-000000000001","{"login_methods":{"otp_enabled":0,"google_login_enabled":0,"email_password_enabled":1},"account_protection":{"lockout_duration_minutes":30,"max_failed_login_attempts_count":2,"auto_deactivate_after_inactivity_days":90},"password_lifecycle":{"password_history_count":5,"password_expiry_period_days":90,"password_reset_link_validity_hours":24},"password_complexity":{"minimum_length":14,"required_character_classes":["uppercase_letter","lowercase_letter","number"]},"multi_factor_authentication":{"enable_mfa_flag":0,"enforce_for_institution_users_flag":0,"allowed_mfa_modes":"email"}}","2026-08-17 07:44:10.368 UTC","00000000-0000-0000-0000-000000000001"]`;

function parseBroken(s) {
  let inner = s.substring(1, s.length - 1);
  const res = [];
  let current = '';
  let braces = 0;
  let brackets = 0;
  for (let i=0; i<inner.length; i++) {
    const char = inner[i];
    if (char === '{') braces++;
    else if (char === '}') braces--;
    else if (char === '[') brackets++;
    else if (char === ']') brackets--;
    
    if (char === ',' && braces === 0 && brackets === 0) {
      res.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  if (current) res.push(current.trim());
  return res.map(r => {
    if (r.startsWith('"') && r.endsWith('"')) {
      return r.substring(1, r.length - 1); // remove outer quotes
    }
    return r;
  });
}

const parsed = parseBroken(str);
console.log("Length:", parsed.length);
parsed.forEach((p, i) => console.log(i, p.substring(0, 50)));
