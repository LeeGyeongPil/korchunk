# 보안 정책 / Security policy

보안 취약점을 발견하셨다면 **공개 이슈 대신** 이 레포의 **Security → Report a vulnerability**(비공개 취약점 신고)로 알려 주세요. 확인 후 답변드리고, 고친 버전을 릴리스하면서 함께 안내합니다.

If you find a security issue, please **do not open a public issue**. Use **Security → Report a vulnerability** in this repository to report it privately. We will reply after checking and announce the fix with a release.

라이브러리는 파일·네트워크에 접근하지 않고 입력 문자열만 처리합니다. `protect` 에 넘기는 정규식의 비용은 호출자 책임입니다. / The library does not access files or the network; it only processes the input string. The cost of regular expressions passed to `protect` is the caller's responsibility.
