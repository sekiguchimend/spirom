import { NextPage } from 'next';

interface ErrorProps {
  statusCode?: number;
}

const Error: NextPage<ErrorProps> = ({ statusCode }) => {
  return (
    <div style={{
      minHeight: '60vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem'
    }}>
      <h1 style={{ fontSize: '4rem', fontWeight: 900, marginBottom: '1rem' }}>
        {statusCode || 'Error'}
      </h1>
      <p style={{ fontSize: '1.25rem', color: '#666', marginBottom: '2rem' }}>
        {statusCode === 404 ? 'ページが見つかりませんでした' : 'エラーが発生しました'}
      </p>
      <a
        href="/"
        style={{
          backgroundColor: '#000',
          color: '#fff',
          padding: '0.75rem 1.5rem',
          borderRadius: '0.25rem',
          textDecoration: 'none'
        }}
      >
        トップページへ戻る
      </a>
    </div>
  );
};

Error.getInitialProps = ({ res, err }) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404;
  return { statusCode };
};

export default Error;
