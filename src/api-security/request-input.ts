export function requestPathError(path: string): string {
  if (!path.startsWith('/') || path.startsWith('//') || /[\s{}"<>]/.test(path))
    return 'Request Path에는 /api/orders 같은 경로만 입력하세요. Method는 선택란에서, 본문은 Request Body JSON에 따로 입력합니다. 공백은 %20으로 인코딩하세요.';
  return '';
}
