export async function readApiError(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json();
    if (!body || typeof body !== 'object' || !('message' in body)) {
      return 'La requête a échoué';
    }
    const message = body.message;
    if (typeof message === 'string' && message.length > 0) {
      return message;
    }
    if (Array.isArray(message)) {
      const text = message.filter((item): item is string => typeof item === 'string').join(' ');
      if (text) {
        return text;
      }
    }
  } catch {
    return 'La requête a échoué';
  }
  return 'La requête a échoué';
}
